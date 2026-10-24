import QtQuick
import QtQuick.Effects
import Quickshell
import qs.Commons
import qs.Ui
import "Model.js" as Model

// Controls island: a volume ring, a brightness ring for this monitor and the
// keyboard layout as an emblem (eagle, hammer and sickle, tryzub). Scroll a
// ring to change it; click volume to mute and right-click it for Omarchy's
// audio panel; click the emblem for the next layout. Rings use the dock's
// text colour like the system stats.
BorderSurface {
  id: island

  required property var audio
  required property var keyboard
  required property var spaces
  required property var dock
  property string screenName: ""
  property bool active: true
  property bool flat: false

  readonly property var cfg: spaces.cfg
  readonly property var dm: spaces.dm
  readonly property color fg: spaces.fg

  readonly property var items: {
    var list = []
    if (cfg.showVolume && audio.available) list.push("volume")
    if (cfg.showBrightness && brightness.available) list.push("brightness")
    if (cfg.showLanguage && keyboard.available) list.push("language")
    return list
  }
  readonly property bool shown: items.length > 0
  readonly property int inset: Math.max(0, Math.round((height - dm.pillThickness) / 2))
  readonly property int ringSize: Math.round(dm.pillThickness * 0.94)

  visible: shown
  width: shown ? row.implicitWidth + inset * 2 + spaces.sp(4) * 2 : 0
  color: flat ? "transparent" : Color.bar.background
  borderSpec: flat ? Border.none() : Border.surfaceSpec("bar", "border", "transparent", 0)

  Brightness {
    id: brightness
    screenName: island.screenName
    active: island.active && island.cfg.showBrightness
  }

  function percentText(value) {
    return Math.round(value) + "%"
  }

  function tooltipFor(key) {
    if (key === "volume")
      return "Volume · " + percentText(island.audio.volume * 100) + (island.audio.muted ? " · muted" : "")
        + (island.audio.deviceName ? "\n" + island.audio.deviceName : "")
        + "\nScroll: volume · Click: mute · Right-click: audio panel"
    if (key === "brightness")
      return "Brightness · " + percentText(brightness.percent)
        + "\n" + island.screenName + (brightness.internal ? " · built-in display" : " · DDC/CI")
        + "\nScroll: brightness"
    return island.keyboard.language.label + "\nClick: next layout · Scroll: switch layout"
  }

  Row {
    id: row
    anchors.centerIn: parent
    spacing: island.spaces.sp(6)

    Repeater {
      model: island.items

      delegate: Item {
        id: control

        required property string modelData
        readonly property bool tooltipHovered: controlMouse.containsMouse
        readonly property bool isLanguage: modelData === "language"
        property real wheelCarry: 0

        width: island.ringSize
        height: island.ringSize
        scale: controlMouse.containsMouse ? 1.08 : 1
        Behavior on scale { enabled: island.spaces.fastDur > 0; NumberAnimation { duration: island.spaces.fastDur; easing.type: Easing.OutCubic } }

        StatRing {
          anchors.fill: parent
          fraction: control.modelData === "volume" ? Math.min(1, island.audio.volume)
            : control.modelData === "brightness" ? brightness.percent / 100 : -1
          color: island.fg
          trackColor: Util.alpha(island.fg, 0.12)
          glyph: control.modelData === "volume" ? Model.volumeGlyph(island.audio.volume, island.audio.muted)
            : control.modelData === "brightness" ? Model.brightnessGlyph(brightness.percent) : ""
          glyphColor: island.fg
          fontFamily: island.spaces.fontFamily
          dim: control.modelData === "volume" && island.audio.muted
        }

        // Layout emblem, tinted with the dock's text colour.
        Image {
          id: emblem
          visible: false
          anchors.centerIn: parent
          width: Math.round(island.ringSize * 0.56)
          height: width
          fillMode: Image.PreserveAspectFit
          sourceSize.width: Math.round(width * Screen.devicePixelRatio)
          sourceSize.height: Math.round(height * Screen.devicePixelRatio)
          source: control.isLanguage && island.keyboard.language.icon !== "" ? Qt.resolvedUrl(island.keyboard.language.icon) : ""
          layer.enabled: control.isLanguage
        }

        MultiEffect {
          anchors.fill: emblem
          source: emblem
          visible: control.isLanguage && emblem.status === Image.Ready
          colorization: 1.0
          colorizationColor: island.fg
        }

        // Layouts without an emblem show their short code.
        Text {
          anchors.centerIn: parent
          visible: control.isLanguage && island.keyboard.language.icon === ""
          text: island.keyboard.language.code
          color: island.fg
          font.family: island.spaces.fontFamily
          font.pixelSize: Math.round(island.dm.labelPx * 0.78)
          font.bold: true
        }

        MouseArea {
          id: controlMouse
          anchors.fill: parent
          hoverEnabled: true
          acceptedButtons: Qt.LeftButton | Qt.RightButton
          cursorShape: control.modelData === "brightness" ? Qt.ArrowCursor : Qt.PointingHandCursor

          function leftClick() {
            island.dock.hideTooltip(control)
            if (control.modelData === "volume") island.audio.toggleMute()
            else if (control.isLanguage) island.keyboard.cycle(1)
          }

          onClicked: function(mouse) {
            if (mouse.button !== Qt.RightButton) {
              leftClick()
              return
            }
            island.dock.hideTooltip(control)
            if (control.modelData === "volume") island.audio.openPanel()
            else if (control.isLanguage) island.keyboard.cycle(-1)
          }

          onWheel: function(wheel) {
            var result = Model.wheelSteps(control.wheelCarry, wheel.angleDelta.y || wheel.angleDelta.x)
            control.wheelCarry = result.rest
            if (result.steps === 0) return
            island.dock.hideTooltip(control)
            if (control.modelData === "volume") island.audio.step(result.steps)
            else if (control.modelData === "brightness") brightness.step(result.steps)
            else island.keyboard.cycle(result.steps > 0 ? 1 : -1)
          }

          onContainsMouseChanged: {
            if (containsMouse) island.dock.showTooltip(control, island.tooltipFor(control.modelData))
            else island.dock.hideTooltip(control)
          }
        }
      }
    }
  }
}
