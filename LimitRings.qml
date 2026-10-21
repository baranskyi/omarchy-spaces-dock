import QtQuick

// Two concentric progress rings for one AI provider: the outer ring is the
// session (5-hour) window, the inner ring the weekly window. Arcs start at
// twelve o'clock and run clockwise. A window that does not exist draws only
// its faint track.
Canvas {
  id: rings

  property real sessionPercent: -1   // 0..1, or -1 for "no session window"
  property real weeklyPercent: -1    // 0..1, or -1 for "no weekly window"
  property color color: "#d97757"
  property color trackColor: Qt.rgba(0, 0, 0, 0.12)
  property color letterColor: color
  property string letter: ""
  property string fontFamily: ""
  property bool stale: false

  readonly property real stroke: Math.max(2.5, Math.round(width * 0.11))
  readonly property real ringGap: Math.max(1.5, Math.round(width * 0.05))

  antialiasing: true
  opacity: stale ? 0.55 : 1

  onSessionPercentChanged: requestPaint()
  onWeeklyPercentChanged: requestPaint()
  onColorChanged: requestPaint()
  onTrackColorChanged: requestPaint()
  onWidthChanged: requestPaint()
  onHeightChanged: requestPaint()

  function ring(ctx, radius, percent) {
    var cx = width / 2
    var cy = height / 2
    ctx.lineWidth = rings.stroke
    ctx.lineCap = "round"
    ctx.strokeStyle = rings.trackColor
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()
    if (!(percent > 0)) return
    var start = -Math.PI / 2
    ctx.strokeStyle = rings.color
    ctx.beginPath()
    ctx.arc(cx, cy, radius, start, start + Math.PI * 2 * Math.min(1, percent))
    ctx.stroke()
  }

  onPaint: {
    var ctx = getContext("2d")
    ctx.reset()
    ctx.clearRect(0, 0, width, height)
    var outer = Math.min(width, height) / 2 - rings.stroke / 2
    var inner = outer - rings.stroke - rings.ringGap
    ring(ctx, outer, rings.sessionPercent)
    if (inner > rings.stroke / 2) ring(ctx, inner, rings.weeklyPercent)
  }

  Text {
    anchors.centerIn: parent
    visible: rings.letter !== ""
    text: rings.letter
    color: rings.letterColor
    font.family: rings.fontFamily
    font.pixelSize: Math.max(8, Math.round(rings.width * 0.24))
    font.bold: true
  }
}
