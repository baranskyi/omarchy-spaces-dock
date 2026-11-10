import QtQuick
import QtQuick.Effects

// Two concentric progress rings for one AI provider; which limit each shows
// is Model.limitRings' choice (session and week, or week and Fable week for
// Claude). Arcs start at
// twelve o'clock and run clockwise. A window that does not exist draws only
// its faint track. The provider's logo sits in the middle, cut to a circle;
// the letter shows until (or unless) the logo loads.
Canvas {
  id: rings

  property real outerPercent: -1     // 0..1, or -1 for "no such limit"
  property real innerPercent: -1     // 0..1, or -1 for "no such limit"
  // False for a provider with a single limit: only the outer ring is drawn.
  property bool showInner: true
  property color color: "#d97757"
  property color trackColor: Qt.rgba(0, 0, 0, 0.12)
  property color letterColor: color
  property string letter: ""
  property url logo: ""
  property string fontFamily: ""
  property bool stale: false

  readonly property real stroke: Math.max(2.5, Math.round(width * 0.09))
  readonly property real ringGap: Math.max(1.5, Math.round(width * 0.045))
  // Diameter of the hole inside the inner ring.
  readonly property real hole: Math.max(0, width - 4 * stroke - 2 * ringGap)

  antialiasing: true
  opacity: stale ? 0.55 : 1

  onOuterPercentChanged: requestPaint()
  onInnerPercentChanged: requestPaint()
  onShowInnerChanged: requestPaint()
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
    ring(ctx, outer, rings.outerPercent)
    if (rings.showInner && inner > rings.stroke / 2) ring(ctx, inner, rings.innerPercent)
  }

  // App icons carry transparent padding (macOS-style rounded squares), so the
  // image is drawn larger than the circle and the padding falls outside it.
  readonly property real logoSize: Math.round(rings.hole - rings.ringGap)
  property real logoZoom: 1.0

  Image {
    id: logoImage
    anchors.centerIn: parent
    width: Math.round(rings.logoSize * rings.logoZoom)
    height: width
    visible: false
    source: rings.logo
    sourceSize.width: width * 2
    sourceSize.height: height * 2
    fillMode: Image.PreserveAspectCrop
    asynchronous: true
    smooth: true
    mipmap: true
  }

  Item {
    id: logoMask
    anchors.fill: logoImage
    visible: false
    layer.enabled: true
    Rectangle {
      anchors.centerIn: parent
      width: rings.logoSize
      height: width
      radius: width / 2
      color: "black"
    }
  }

  MultiEffect {
    anchors.fill: logoImage
    source: logoImage
    visible: logoImage.status === Image.Ready
    maskEnabled: true
    maskSource: logoMask
    maskThresholdMin: 0.5
    maskSpreadAtMin: 1.0
  }

  Text {
    anchors.centerIn: parent
    visible: rings.letter !== "" && logoImage.status !== Image.Ready
    text: rings.letter
    color: rings.letterColor
    font.family: rings.fontFamily
    font.pixelSize: Math.max(8, Math.round(rings.width * 0.24))
    font.bold: true
  }
}
