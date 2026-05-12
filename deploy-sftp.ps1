param(
  [string]$ServerHost = "",
  [int]$Port = 22,
  [string]$User = "",
  [string]$Password = "",
  [string]$RemotePath = "",
  [string]$SshHostKeyFingerprint = "",
  [string]$WinScpPath = "",
  [string]$BuildId = ""
)

$ErrorActionPreference = "Stop"

function Get-RequiredValue([string]$CurrentValue, [string]$EnvName, [string]$ParamName) {
  $v = $CurrentValue
  if ([string]::IsNullOrWhiteSpace($v)) {
    $envItem = Get-Item -Path "Env:$EnvName" -ErrorAction SilentlyContinue
    $v = if ($envItem) { [string]$envItem.Value } else { "" }
  }
  if ([string]::IsNullOrWhiteSpace($v)) {
    throw "Missing required value: -$ParamName or env:$EnvName"
  }
  return $v.Trim()
}

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Command not found: $Name"
  }
}

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

$ServerHost = Get-RequiredValue -CurrentValue $ServerHost -EnvName "DEPLOY_SFTP_HOST" -ParamName "ServerHost"
$User = Get-RequiredValue -CurrentValue $User -EnvName "DEPLOY_SFTP_USER" -ParamName "User"
$Password = Get-RequiredValue -CurrentValue $Password -EnvName "DEPLOY_SFTP_PASSWORD" -ParamName "Password"
$RemotePath = Get-RequiredValue -CurrentValue $RemotePath -EnvName "DEPLOY_SFTP_REMOTE_PATH" -ParamName "RemotePath"
if ([string]::IsNullOrWhiteSpace($WinScpPath)) {
  $WinScpPath = [string](Get-Item -Path "Env:DEPLOY_WINSCP_PATH" -ErrorAction SilentlyContinue).Value
}
if ([string]::IsNullOrWhiteSpace($WinScpPath)) {
  $WinScpPath = "C:\Program Files (x86)\WinSCP\WinSCP.com"
}

if (-not (Test-Path $WinScpPath)) {
  throw "WinSCP.com not found at: $WinScpPath"
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$srcTools = Join-Path $repoRoot "tools"
$distTools = Join-Path $repoRoot "dist-tools"
$effectiveBuildId = if ([string]::IsNullOrWhiteSpace($BuildId)) {
  [DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString()
} else {
  $rawBuildId = $BuildId.Trim()
  if ($rawBuildId -notmatch '^\d+$') {
    throw "BuildId must be a numeric Unix timestamp (seconds), e.g. 1715539200"
  }
  $rawBuildId
}

if (-not (Test-Path $srcTools)) {
  throw "Source folder not found: $srcTools"
}

Require-Command "npx"

Write-Host "[1/6] Prepare dist folder..."
if (Test-Path $distTools) {
  Remove-Item $distTools -Recurse -Force
}
New-Item -ItemType Directory -Path $distTools | Out-Null
Copy-Item (Join-Path $srcTools "*") $distTools -Recurse -Force

Write-Host "[2/6] Stamp module deps (?v=$effectiveBuildId)..."
Write-Host "[2/6] Stamp build version marker..."

# Add build timestamp marker into every HTML (safe, no URL rewriting)
Get-ChildItem $distTools -Recurse -File -Filter *.html | ForEach-Object {
  $raw = Get-Content $_.FullName -Raw -Encoding UTF8
  if ($raw -notmatch "<!--\s*build:") {
    $raw = "<!-- build:$effectiveBuildId -->`n" + $raw
  } else {
    $raw = [regex]::Replace($raw, "<!--\s*build:[^>]*-->", "<!-- build:$effectiveBuildId -->", 1)
  }
  Write-Utf8NoBom -Path $_.FullName -Content $raw
}

# Add build marker for all JS files (safe, no URL rewriting)
Get-ChildItem $distTools -Recurse -File -Filter *.js | ForEach-Object {
  $raw = Get-Content $_.FullName -Raw -Encoding UTF8
  if ($raw -notmatch "/\*\s*build:") {
    $raw = "/* build:$effectiveBuildId */`n" + $raw
  } else {
    $raw = [regex]::Replace($raw, "/\*\s*build:[^*]*\*/", "/* build:$effectiveBuildId */", 1)
  }
  Write-Utf8NoBom -Path $_.FullName -Content $raw
}

Write-Host "[2/6] Build asset manifest (importmap)..."
$manifestImports = @{}
Get-ChildItem $distTools -Recurse -File -Filter *.js | ForEach-Object {
  $full = $_.FullName
  $rel = $full.Substring($distTools.Length).TrimStart('\', '/').Replace('\', '/')
  if ([string]::IsNullOrWhiteSpace($rel)) { return }
  $manifestImports["./$rel"] = "./$rel?v=$effectiveBuildId"
}
$manifestObject = @{
  version = $effectiveBuildId
  imports = $manifestImports
}
$manifestJson = $manifestObject | ConvertTo-Json -Depth 8
Write-Utf8NoBom -Path (Join-Path $distTools "asset-manifest.json") -Content $manifestJson

Write-Host "[3/6] Minify JS..."
Get-ChildItem $distTools -Recurse -File -Filter *.js | ForEach-Object {
  $src = $_.FullName
  $tmp = "$src.tmp-min"
  npx terser $src -c -m -o $tmp | Out-Null
  Move-Item -LiteralPath $tmp -Destination $src -Force
}

Write-Host "[4/6] Minify CSS..."
Get-ChildItem $distTools -Recurse -File -Filter *.css | ForEach-Object {
  $src = $_.FullName
  $tmp = "$src.tmp-min"
  npx clean-css-cli -O2 $src -o $tmp | Out-Null
  Move-Item -LiteralPath $tmp -Destination $src -Force
}

Write-Host "[5/6] Minify HTML..."
Get-ChildItem $distTools -Recurse -File -Filter *.html | ForEach-Object {
  $src = $_.FullName
  $tmp = "$src.tmp-min"
  npx html-minifier-terser `
    --collapse-whitespace `
    --remove-comments `
    --minify-css true `
    --minify-js true `
    -o $tmp $src | Out-Null
  Move-Item -LiteralPath $tmp -Destination $src -Force
}

Write-Host "[6/6] Upload via WinSCP..."
$encodedPassword = [System.Uri]::EscapeDataString($Password)
$sessionUrl = "sftp://$User`:$encodedPassword@$ServerHost`:$Port/"
$hostKeyOpt = ""
if ([string]::IsNullOrWhiteSpace($SshHostKeyFingerprint)) {
  $hostKeyOpt = "-hostkey=*"
} else {
  $hostKeyOpt = "-hostkey=`"$SshHostKeyFingerprint`""
}

$scriptPath = Join-Path $env:TEMP "winscp-deploy-script.txt"
$distToolsWinScp = (Get-Item $distTools).FullName
Write-Utf8NoBom -Path $scriptPath -Content ((@(
  "option batch continue"
  "option confirm off"
  "open $sessionUrl $hostKeyOpt"
  "synchronize remote -delete -criteria=checksum -transfer=binary `"$distToolsWinScp`" `"$RemotePath`""
  "exit"
) -join "`r`n") + "`r`n")

& $WinScpPath "/script=$scriptPath"

Write-Host "Deploy complete."
