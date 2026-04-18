export const drawFlowStartMarker = (c, x, y, label, stroke, outline, dotR = 16) => {
  c.beginPath();
  c.arc(x, y, dotR, 0, Math.PI * 2);
  c.fillStyle = "#fff";
  c.fill();
  c.lineWidth = 7.8;
  c.strokeStyle = outline;
  c.stroke();
  c.lineWidth = 5.2;
  c.strokeStyle = stroke;
  c.stroke();
  c.fillStyle = "#000";
  c.fillText(String(label || ""), x, y);
};

export const drawFlowEndMarker = (c, x, y, angle, stroke, outline, endW = 7.2, endH = 26) => {
  c.save();
  c.translate(x || 0, y || 0);
  c.rotate(Number(angle) || 0);
  c.fillStyle = stroke;
  c.fillRect(-endW / 2, -endH / 2, endW, endH);
  c.strokeStyle = outline;
  c.lineWidth = 1.8;
  c.strokeRect(-endW / 2, -endH / 2, endW, endH);
  c.restore();
};
