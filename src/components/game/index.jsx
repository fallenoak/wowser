import React from 'react';

import './index.styl';

import Controls from './controls';
import HUD from './hud';
import Stats from './stats';
import session from '../wowser/session';

class GameScreen extends React.Component {

  static id = 'game';
  static title = 'Game';

  constructor() {
    super();

    this.resize = ::this.resize;
    this.updateRefs = ::this.updateRefs;
  }

  componentDidMount() {
    window.addEventListener('resize', this.resize);

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.forceUpdate();

    session.world.render(this.refs.canvas, width, height);

    session.world.renderer.on('render', this.updateRefs);

    // Darkshire (Eastern Kingdoms)
    session.player.worldport(0, -10559, -1189, 28);

    // Booty Bay (Eastern Kingdoms)
    // session.player.worldport(0, -14354, 518, 22);

    // Stonewrought Dam (Eastern Kingdoms)
    // session.player.worldport(0, -4651, -3316, 296);

    // Ironforge (Eastern Kingdoms)
    // session.player.worldport(0, -4981.25, -881.542, 502.66);

    // Darnassus (Kalimdor)
    // session.player.worldport(1, 9947, 2557, 1316);

    // Astranaar (Kalimdor)
    // session.player.worldport(1, 2752, -348, 107);

    // Moonglade (Kalimdor)
    // session.player.worldport(1, 7827, -2425, 489);

    // Un'Goro Crater (Kalimdor)
    // session.player.worldport(1, -7183, -1394, -183);

    // Everlook (Kalimdor)
    // session.player.worldport(1, 6721.44, -4659.09, 721.893);

    // Stonetalon Mountains (Kalimdor)
    // session.player.worldport(1, 2506.3, 1470.14, 263.722);

    // Mulgore (Kalimdor)
    // session.player.worldport(1, -1828.913, -426.307, 6.299);

    // Thunderbluff (Kalimdor)
    // session.player.worldport(1, -1315.901, 138.6357, 302.008);

    // Auberdine (Kalimdor)
    // session.player.worldport(1, 6355.151, 508.831, 15.859);

    // The Exodar (Expansion 01)
    // session.player.worldport(530, -4013, -11894, -2);

    // Nagrand (Expansion 01)
    // session.player.worldport(530, -743.149, 8385.114, 33.435);

    // Eversong Woods (Expansion 01)
    // session.player.worldport(530, 9152.441, -7442.229, 68.144);

    // Daggercap Bay (Northrend)
    // session.player.worldport(571, 1031, -5192, 180);

    // Dalaran (Northrend)
    // session.player.worldport(571, 5797, 629, 647);
  }

  componentWillUnmount() {
    if (session.world.renderer) {
      session.world.renderer.stop();
    }

    window.removeEventListener('resize', this.resize);
  }

  resize() {
    session.world.renderer.resize(window.innerWidth, window.innerHeight);
  }

  updateRefs() {
    this.refs.controls.update();
    this.refs.stats.forceUpdate();
  }

  render() {
    return (
      <game className="game screen">
        <canvas ref="canvas"></canvas>
        <HUD />
        <Controls ref="controls" for={ session.player } camera={ session.world.renderer.camera } />
        <Stats ref="stats" world={ session.world } />
      </game>
    );
  }

}

export default GameScreen;
