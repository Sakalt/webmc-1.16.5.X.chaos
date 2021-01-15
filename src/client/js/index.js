// Generated by CoffeeScript 2.5.1
var Game;

import * as THREE from "three";

import Stats from "stats-js";

import * as dat from "dat.gui";

import io from "socket.io-client";

import TWEEN from "@tweenjs/tween.js";

import {
  World
} from "./World/World.js";

import {
  FirstPersonControls
} from "./FirstPersonControls.js";

import {
  gpuInfo
} from "./gpuInfo.js";

import {
  AssetLoader
} from "./AssetLoader.js";

import {
  InventoryBar
} from "./InventoryBar.js";

import {
  RandomNick
} from "./RandomNick.js";

import {
  Chat
} from "./Chat.js";

import {
  Entities
} from "./Entities.js";

import {
  PlayerInInventory
} from "./PlayerInInventory.js";

import {
  BlockBreak
} from "./BlockBreak.js";

import {
  BlockPlace
} from "./BlockPlace.js";

Game = class Game {
  constructor(options) {
    var _this;
    _this = this;
    this.al = new AssetLoader(function() {
      _this.init();
    });
  }

  init(al) {
    var _this, chunkDist, directionalLight, eventMap, gui, i;
    _this = this;
    this.TWEEN = TWEEN;
    this.fov = 70;
    this.toxelSize = 27;
    this.cellSize = 16;
    this.canvas = document.querySelector("#c");
    this.pcanvas = document.querySelector("#c_player");
    this.dimension = null;
    this.socket = io.connect(":8081");
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      PixelRatio: window.devicePixelRatio
    });
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#adc8ff");
    this.camera = new THREE.PerspectiveCamera(this.fov, 2, 0.1, 1000);
    this.camera.rotation.order = "YXZ";
    this.camera.position.set(26, 26, 26);
    this.scene.add(new THREE.AmbientLight(0xcccccc));
    directionalLight = new THREE.DirectionalLight(0x333333, 2);
    directionalLight.position.set(1, 1, 0.5).normalize();
    this.scene.add(directionalLight);
    console.warn(gpuInfo());
    this.nick = document.location.hash.substring(1, document.location.hash.length);
    if (this.nick === "") {
      this.nick = RandomNick();
      document.location.href = `\#${this.nick}`;
    }
    this.stats = new Stats();
    this.drawcalls = this.stats.addPanel(new Stats.Panel("calls", "#ff8", "#221"));
    this.stats.showPanel(3);
    document.body.appendChild(this.stats.dom);
    this.pii = new PlayerInInventory(this);
    this.ent = new Entities(this);
    this.bb = new BlockBreak(this);
    this.bp = new BlockPlace(this);
    this.world = new World(this);
    this.chat = new Chat(this);
    this.inv_bar = new InventoryBar(this);
    this.FPC = new FirstPersonControls(this);
    eventMap = {
      "connect": function() {
        console.log("Połączono z serverem!");
        $(".loadingText").text("Za chwilę dołączysz do gry...");
        console.log(`User nick: ${_this.nick}`);
        _this.socket.emit("initClient", {
          nick: _this.nick
        });
      },
      "blockUpdate": function(block) {
        _this.world.setBlock(block[0], block[1] + 16, block[2], block[3]);
      },
      "spawn": function(yaw, pitch) {
        console.log("Gracz dołączył do gry!");
        $(".initLoading").css("display", "none");
        _this.camera.rotation.y = yaw;
        _this.camera.rotation.x = pitch;
      },
      "dimension": function(dim) {
        _this.dimension = dim;
        console.log(`Player dimension has been changed: ${dim}`);
      },
      "mapChunk": function(sections, x, z, biomes, dim) {
        _this.world._computeSections(sections, x, z, biomes, dim);
      },
      "hp": function(points) {
        _this.inv_bar.setHp(points);
      },
      "inventory": function(inv) {
        _this.inv_bar.updateInv(inv);
      },
      "food": function(points) {
        _this.inv_bar.setFood(points);
      },
      "msg": function(msg) {
        _this.chat.log(msg);
      },
      "kicked": function(reason) {
        _this.chat.log("You have been kicked!");
      },
      "xp": function(xp) {
        _this.inv_bar.setXp(xp.level, xp.progress);
      },
      "move": function(pos) {
        var to;
        to = {
          x: pos.x - 0.5,
          y: pos.y + 17,
          z: pos.z - 0.5
        };
        new TWEEN.Tween(_this.camera.position).to(to, 100).easing(TWEEN.Easing.Quadratic.Out).start();
      },
      "entities": function(entities) {
        _this.ent.update(entities);
      },
      "diggingCompleted": function(block) {
        _this.bb.done = true;
        console.warn("SERVER-DONE");
      },
      "diggingAborted": function(block) {
        console.warn("SERVER-ABORT");
      },
      "digTime": function(time, block) {
        console.warn("SERVER-START");
        _this.bb.startDigging(time);
      }
    };
    for (i in eventMap) {
      this.socket.on(i, eventMap[i]);
    }
    gui = new dat.GUI();
    this.params = {
      fog: false,
      chunkdist: 3
    };
    gui.add(this.params, "fog").name("Enable fog").listen().onChange(function() {
      if (_this.params.fog) {
        return _this.scene.fog = new THREE.Fog(new THREE.Color("#adc8ff"), (_this.params.chunkdist - 2.5) * 16, (_this.params.chunkdist - 0.5) * 16);
      } else {
        return _this.scene.fog = null;
      }
    });
    gui.add(this.world.material, "wireframe").name("Wireframe").listen();
    chunkDist = gui.add(this.params, "chunkdist", 0, 10, 1).name("Render distance").listen();
    chunkDist.onChange(function(val) {
      if (_this.scene.fog !== null) {
        _this.scene.fog.near = (val - 2.5) * 16;
        _this.scene.fog.far = (val - 0.5) * 16;
      }
      console.log(val);
    });
    this.mouse = false;
    $(document).mousedown(function(e) {
      if (e.which === 1) {
        _this.mouse = true;
        if (_this.FPC.gameState === "gameLock") {
          _this.bb.digRequest();
        }
      } else if (e.which === 3) {
        _this.bp.placeBlock();
      }
    });
    $(document).mouseup(function(e) {
      if (e.which === 1) {
        _this.mouse = false;
        return _this.bb.stopDigging();
      }
    });
    return this.animate();
  }

  animate() {
    var _this;
    _this = this;
    if (this.stats !== null) {
      this.stats.begin();
      this.render();
      this.stats.end();
    }
    requestAnimationFrame(function() {
      return _this.animate();
    });
  }

  render() {
    var _this, height, width;
    _this = this;
    width = window.innerWidth;
    height = window.innerHeight;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
    this.bb.updatePos(function() {
      if (_this.bb.isDigging) {
        _this.bb.stopDigging();
      }
      if (_this.mouse && _this.bb.done) {
        return _this.bb.digRequest();
      }
    });
    this.world.updateCellsAroundPlayer(this.camera.position, this.params.chunkdist);
    TWEEN.update();
    this.drawcalls.update(this.renderer.info.render.calls, 100);
    if (this.FPC.gameState === "inventory") {
      this.pii.render();
    }
    this.inv_bar.tick();
    this.renderer.render(this.scene, this.camera);
  }

};

new Game();
