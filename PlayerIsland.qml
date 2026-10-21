import QtQuick
import QtQuick.Effects
import Quickshell
import Quickshell.Hyprland
import qs.Commons
import qs.Ui

// Compact now-playing island: cover art, title and artist, and playback
// buttons. Sizes follow the workspace pills (Spaces.dm) so it matches the dock.
BorderSurface {
  id: island

  required property var media
  required property var spaces
  required property var dock
  property bool flat: false

  readonly property var cfg: spaces.cfg
  readonly property var dm: spaces.dm
  readonly property color fg: spaces.fg
  readonly property bool shown: cfg.showPlayer && media.hasMedia
  readonly property int inset: Math.max(0, Math.round((height - dm.pillThickness) / 2))
  // Natural widths, measured apart from the elided Text items they size.
  readonly property int textWidth: Math.min(Style.space(200), Math.ceil(Math.max(titleMetrics.advanceWidth, artistMetrics.advanceWidth)))

  TextMetrics { id: titleMetrics; font: titleText.font; text: titleText.text }
  TextMetrics { id: artistMetrics; font: artistText.font; text: artistText.text }

  visible: shown
  width: shown ? content.implicitWidth + inset * 2 + spaces.sp(2) : 0
  color: flat ? "transparent" : Color.bar.background
  borderSpec: flat ? Border.none() : Border.surfaceSpec("bar", "border", "transparent", 0)

  // Focus the player's window through Hyprland. Spotify on Linux claims it
  // can raise itself over MPRIS but ignores the request, so MPRIS raise() is
  // only the fallback for players without a window Hyprland knows.
  function focusPlayer() {
    var toplevels = Hyprland.toplevels.values
    var identity = island.media.identity.toLowerCase()
    for (var i = 0; i < toplevels.length; i++) {
      var tl = toplevels[i]
      var cls = String((tl.wayland && tl.wayland.appId) || (tl.lastIpcObject && tl.lastIpcObject["class"]) || "").toLowerCase()
      if (cls === "" ) continue
      if (cls === identity || (island.media.isSpotify && cls.indexOf("spotify") !== -1)) {
        island.spaces.focusWindow(String(tl.address))
        return
      }
    }
    island.media.raise()
  }

  function trackTip() {
    var line = island.media.artist && island.media.title
      ? island.media.artist + " — " + island.media.title
      : (island.media.title || island.media.artist)
    if (island.media.album) line += "\n" + island.media.album
    if (!line) line = (island.media.identity || "Spotify") + " · nothing playing"
    return line + "\nClick to open " + (island.media.identity || "the player")
  }

  MouseArea {
    anchors.fill: parent
    acceptedButtons: Qt.RightButton
    onClicked: island.spaces.toggle()
  }

  Row {
    id: content
    anchors.left: parent.left
    anchors.leftMargin: island.inset
    anchors.verticalCenter: parent.verticalCenter
    spacing: island.dm.gap

    // Cover art, or a note glyph until it loads.
    Item {
      id: art
      width: island.dm.pillThickness
      height: width
      anchors.verticalCenter: parent.verticalCenter
      readonly property bool tooltipHovered: artMouse.containsMouse

      Rectangle {
        anchors.fill: parent
        radius: island.spaces.pillRadius
        color: Util.alpha(island.fg, 0.1)
      }

      Text {
        anchors.centerIn: parent
        visible: cover.status !== Image.Ready
        text: "\u{f075a}"
        color: island.fg
        opacity: 0.6
        font.family: island.spaces.fontFamily
        font.pixelSize: Math.round(parent.width * 0.45)
      }

      Image {
        id: cover
        anchors.fill: parent
        visible: false
        source: island.media.artUrl
        sourceSize.width: Math.round(width * 2)
        sourceSize.height: Math.round(height * 2)
        fillMode: Image.PreserveAspectCrop
        asynchronous: true
        smooth: true
        mipmap: true
      }

      Item {
        id: coverMask
        anchors.fill: parent
        visible: false
        layer.enabled: true
        Rectangle {
          anchors.fill: parent
          radius: island.spaces.pillRadius
          color: "black"
        }
      }

      MultiEffect {
        anchors.fill: parent
        source: cover
        visible: cover.status === Image.Ready
        maskEnabled: true
        maskSource: coverMask
        maskThresholdMin: 0.5
        maskSpreadAtMin: 1.0
      }

      MouseArea {
        id: artMouse
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        function leftClick() { island.focusPlayer() }
        onClicked: leftClick()
        onContainsMouseChanged: containsMouse ? island.dock.showTooltip(art, island.trackTip()) : island.dock.hideTooltip(art)
      }
    }

    // Title over artist.
    Item {
      id: trackText
      width: island.textWidth
      height: textColumn.implicitHeight
      anchors.verticalCenter: parent.verticalCenter
      readonly property bool tooltipHovered: textMouse.containsMouse

      Column {
        id: textColumn
        width: parent.width
        spacing: Math.round(island.spaces.sp(1))

        Text {
          id: titleText
          width: parent.width
          // Spotify shows before a track is picked: then its name stands in.
          text: island.media.title || island.media.artist || island.media.identity || "Spotify"
          color: island.fg
          elide: Text.ElideRight
          font.family: island.spaces.fontFamily
          font.pixelSize: Math.round(island.dm.labelPx * 0.78)
          font.bold: true
        }

        Text {
          id: artistText
          width: parent.width
          visible: text !== ""
          text: island.media.title ? island.media.artist : ""
          color: Util.alpha(island.fg, 0.65)
          elide: Text.ElideRight
          font.family: island.spaces.fontFamily
          font.pixelSize: Math.round(island.dm.labelPx * 0.66)
        }
      }

      MouseArea {
        id: textMouse
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        function leftClick() { island.focusPlayer() }
        onClicked: leftClick()
        onContainsMouseChanged: containsMouse ? island.dock.showTooltip(trackText, island.trackTip()) : island.dock.hideTooltip(trackText)
      }
    }

    Row {
      visible: island.cfg.playerControls
      anchors.verticalCenter: parent.verticalCenter
      spacing: Math.round(island.dm.gap / 2)

      ControlButton {
        glyph: "\u{f04ae}"
        active: island.media.canGoPrevious
        onActivated: island.media.previous()
      }

      ControlButton {
        glyph: island.media.playing ? "\u{f03e4}" : "\u{f040a}"
        primary: true
        onActivated: island.media.playPause()
      }

      ControlButton {
        glyph: "\u{f04ad}"
        active: island.media.canGoNext
        onActivated: island.media.next()
      }
    }
  }

  component ControlButton: Item {
    id: button
    property string glyph: ""
    property bool primary: false
    property bool active: true
    signal activated()

    width: Math.round(island.dm.pillThickness * (primary ? 0.8 : 0.62))
    height: width
    anchors.verticalCenter: parent ? parent.verticalCenter : undefined

    Rectangle {
      anchors.fill: parent
      radius: width / 2
      color: button.primary ? island.spaces.activeFill()
        : buttonMouse.containsMouse && button.active ? Util.alpha(island.fg, 0.12) : "transparent"
      scale: buttonMouse.pressed ? 0.92 : 1
      Behavior on scale { enabled: island.spaces.fastDur > 0; NumberAnimation { duration: island.spaces.fastDur } }
    }

    Text {
      anchors.centerIn: parent
      text: button.glyph
      color: button.primary ? island.spaces.activeText() : island.fg
      opacity: button.active ? (buttonMouse.containsMouse || button.primary ? 1 : 0.75) : 0.3
      font.family: island.spaces.fontFamily
      font.pixelSize: Math.round(parent.width * 0.55)
    }

    MouseArea {
      id: buttonMouse
      anchors.fill: parent
      hoverEnabled: true
      enabled: button.active
      cursorShape: Qt.PointingHandCursor
      function leftClick() { button.activated() }
      onClicked: leftClick()
    }
  }
}
