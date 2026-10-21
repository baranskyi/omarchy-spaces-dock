import QtQuick
import Quickshell.Services.Mpris
import "Model.js" as Model

// The media player the dock's player island shows, chosen from MPRIS players
// by Model.pickPlayer: Spotify only, or any player with Spotify not special.
QtObject {
  id: media

  property string source: "spotify"
  // The player you last controlled from the dock wins ties in "any" mode.
  property string preferredKey: ""

  readonly property var players: Mpris.players ? Mpris.players.values : []

  readonly property var player: {
    var list = []
    for (var i = 0; i < media.players.length; i++) {
      var p = media.players[i]
      list.push({
        key: media.keyOf(p),
        spotify: Model.isSpotifyPlayer(p.identity, p.desktopEntry, p.dbusName),
        proxy: Model.isProxyPlayer(p.dbusName, p.desktopEntry),
        playing: !!p.isPlaying,
        stopped: p.playbackState === MprisPlaybackState.Stopped,
        hasTrack: !!(p.trackTitle || p.trackArtist || p.trackArtUrl)
      })
    }
    var index = Model.pickPlayer(list, media.source, media.preferredKey)
    return index >= 0 ? media.players[index] : null
  }

  readonly property bool hasMedia: media.player !== null
  readonly property bool playing: !!(media.player && media.player.isPlaying)
  readonly property string title: media.player ? String(media.player.trackTitle || "") : ""
  readonly property string artist: media.player ? String(media.player.trackArtist || "") : ""
  readonly property string album: media.player ? String(media.player.trackAlbum || "") : ""
  readonly property string artUrl: media.player ? String(media.player.trackArtUrl || "") : ""
  readonly property string identity: media.player ? String(media.player.identity || media.player.desktopEntry || "") : ""
  readonly property bool isSpotify: !!media.player
    && Model.isSpotifyPlayer(media.player.identity, media.player.desktopEntry, media.player.dbusName)
  readonly property bool canGoPrevious: !!(media.player && media.player.canGoPrevious)
  readonly property bool canGoNext: !!(media.player && media.player.canGoNext)

  function keyOf(p) {
    return p ? String(p.dbusName || p.desktopEntry || p.identity || "") : ""
  }

  function remember() {
    var key = media.keyOf(media.player)
    if (key) media.preferredKey = key
  }

  function playPause() {
    var p = media.player
    if (!p) return false
    if (p.isPlaying && p.canPause) p.pause()
    else if (!p.isPlaying && p.canPlay) p.play()
    else if (p.canTogglePlaying) p.togglePlaying()
    else return false
    media.remember()
    return true
  }

  function previous() {
    var p = media.player
    if (!p || !p.canGoPrevious) return false
    p.previous()
    media.remember()
    return true
  }

  function next() {
    var p = media.player
    if (!p || !p.canGoNext) return false
    p.next()
    media.remember()
    return true
  }

  // Asks the player to show its window. Spotify does not support this, so
  // callers fall back to focusing the window through Hyprland.
  function raise() {
    var p = media.player
    if (!p || !p.canRaise) return false
    p.raise()
    return true
  }
}
