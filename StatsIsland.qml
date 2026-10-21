import QtQuick
import Quickshell
import qs.Commons
import qs.Ui
import "Model.js" as Model

// System stats island: one small pill per enabled metric, in the style of the
// workspace pills. Hover a pill for details; click opens btop.
BorderSurface {
  id: island

  required property var stats
  required property var spaces
  required property var dock
  property bool flat: false

  readonly property var cfg: spaces.cfg
  readonly property var dm: spaces.dm
  readonly property color fg: spaces.fg
  readonly property var items: Model.enabledStats(cfg)
  readonly property bool shown: items.length > 0
  readonly property int inset: Math.max(0, Math.round((height - dm.pillThickness) / 2))

  visible: shown
  width: shown ? row.implicitWidth + inset * 2 : 0
  color: flat ? "transparent" : Color.bar.background
  borderSpec: flat ? Border.none() : Border.surfaceSpec("bar", "border", "transparent", 0)

  MouseArea {
    anchors.fill: parent
    acceptedButtons: Qt.RightButton
    onClicked: island.spaces.toggle()
  }

  Row {
    id: row
    anchors.left: parent.left
    anchors.leftMargin: island.inset
    anchors.verticalCenter: parent.verticalCenter
    spacing: island.dm.gap

    Repeater {
      model: island.items

      delegate: Item {
        id: statPill

        required property var modelData
        readonly property bool tooltipHovered: statMouse.containsMouse

        width: statRow.implicitWidth + island.dm.pad * 2
        height: island.dm.pillThickness

        Rectangle {
          anchors.fill: parent
          radius: island.spaces.pillRadius
          color: statMouse.containsMouse ? Util.alpha(island.fg, 0.12) : Util.alpha(island.fg, 0.06)
          Behavior on color { enabled: island.spaces.fastDur > 0; ColorAnimation { duration: island.spaces.fastDur } }
        }

        Row {
          id: statRow
          anchors.centerIn: parent
          spacing: island.spaces.sp(5)

          Text {
            anchors.verticalCenter: parent.verticalCenter
            text: statPill.modelData.icon
            color: island.fg
            opacity: island.stats.ready ? 1 : 0.5
            font.family: island.spaces.fontFamily
            font.pixelSize: Math.round(island.dm.labelPx * 0.95)
          }

          // Fixed to the widest expected value so pills do not jitter.
          Text {
            id: valueText
            anchors.verticalCenter: parent.verticalCenter
            width: Math.max(implicitWidth, widest.width)
            horizontalAlignment: Text.AlignRight
            text: Model.statText(statPill.modelData.key, island.stats.state)
            color: island.fg
            opacity: island.stats.ready ? 1 : 0.5
            font.family: island.spaces.fontFamily
            font.pixelSize: Math.round(island.dm.labelPx * 0.78)
            font.bold: true

            TextMetrics {
              id: widest
              font: valueText.font
              text: statPill.modelData.template
            }
          }
        }

        MouseArea {
          id: statMouse
          anchors.fill: parent
          hoverEnabled: true
          acceptedButtons: Qt.LeftButton
          cursorShape: Qt.PointingHandCursor
          onClicked: island.spaces.run("omarchy-launch-or-focus-tui btop")
          onContainsMouseChanged: {
            if (containsMouse) {
              var detail = Model.statDetail(statPill.modelData.key, island.stats.state)
              island.dock.showTooltip(statPill, statPill.modelData.label + "\n" + detail)
            } else {
              island.dock.hideTooltip(statPill)
            }
          }
        }
      }
    }
  }
}
