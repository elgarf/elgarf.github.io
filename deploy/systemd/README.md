# Systemd service setup (Ubuntu)

1) Project path:
   /home/admin/web/static.93.189.179.185.ip.webhost1.net/public_html
2) Install python dependency:
   pip3 install websockets
3) Copy unit file:
   sudo cp deploy/systemd/led-checklist-ws.service /etc/systemd/system/led-checklist-ws.service
4) Create env file from template:
   sudo cp deploy/systemd/led-checklist-ws.env.example /etc/default/led-checklist-ws
   sudo nano /etc/default/led-checklist-ws
5) Enable and start:
   sudo systemctl daemon-reload
   sudo systemctl enable --now led-checklist-ws
6) Check status/logs:
   sudo systemctl status led-checklist-ws
   sudo journalctl -u led-checklist-ws -f

If you move the project, update `WorkingDirectory` and `ExecStart` in the unit file.
