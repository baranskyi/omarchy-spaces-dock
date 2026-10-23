import QtQuick

// One filling ring for a system stat, with the stat's glyph in the middle.
// The arc starts at twelve o'clock and runs clockwise; without a reading
// (fraction < 0) only the faint track is drawn.
Canvas {
  id: ring

  property real fraction: -1
  property color color: "#2848a9"
  property color trackColor: Qt.rgba(0, 0, 0, 0.12)
  // A soft disc behind the glyph, used to flag warning and critical levels.
  property color discColor: "transparent"
  property string glyph: ""
  property color glyphColor: "black"
  property string fontFamily: ""
  property bool dim: false

  readonly property real stroke: Math.max(2.5, Math.round(width * 0.1))

  antialiasing: true
  opacity: dim ? 0.5 : 1

  onFractionChanged: requestPaint()
  onColorChanged: requestPaint()
  onTrackColorChanged: requestPaint()
  onWidthChanged: requestPaint()
  onHeightChanged: requestPaint()

  onPaint: {
    var ctx = getContext("2d")
    ctx.reset()
    ctx.clearRect(0, 0, width, height)
    var cx = width / 2
    var cy = height / 2
    var radius = Math.min(width, height) / 2 - ring.stroke / 2
    ctx.lineWidth = ring.stroke
    ctx.lineCap = "round"
    ctx.strokeStyle = ring.trackColor
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()
    if (!(ring.fraction > 0)) return
    var start = -Math.PI / 2
    ctx.strokeStyle = ring.color
    ctx.beginPath()
    ctx.arc(cx, cy, radius, start, start + Math.PI * 2 * Math.min(1, ring.fraction))
    ctx.stroke()
  }

  Rectangle {
    anchors.centerIn: parent
    width: Math.round(parent.width - ring.stroke * 2 - 4)
    height: width
    radius: width / 2
    color: ring.discColor
  }

  Text {
    anchors.centerIn: parent
    text: ring.glyph
    color: ring.glyphColor
    font.family: ring.fontFamily
    font.pixelSize: Math.max(9, Math.round(ring.width * 0.4))
  }
}
