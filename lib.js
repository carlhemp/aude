function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
class Gameboard {
  //array of arrays is a list of rows that represent the board
  constructor(arrayOfArrays) {
    console.log(arrayOfArrays);
    let board = [];
    for(const row of arrayOfArrays) {
      let b_row = [];
      for(const column of row) {
        //should we check that it's either null or a Tile object?
        b_row.push(column);
      }
      board.push(b_row);
    }
    this.board = board;
  }
  addTile(tile, row, column) {
    this.board[row][column] = tile;

    //now make sure there is null tile before/after every actual tile.
    if(row == (this.board.length - 1)) { //add row after
      this.addRow();
    }
    if(column == (this.board[row].length - 1)) { //add column after
      this.addColumn();
    }
    if(row == 0) { //add a row before
      this.addRow(true);
    }
    if(column == 0) { //add a column before
      this.addColumn(true);
    }
    this.draw();
  }
  addRow(beginning = false) {
    let row = [];
    for(const x of this.board[0]) {
      row.push(null);
    }
    if(beginning) {
      this.board.unshift(row);
    } else {
      this.board.push(row);
    }
  }
  addColumn(beginning = false) {
    for(const row of this.board) {
      if(beginning) {
        row.unshift(null);
      } else {
        row.push(null);
      }
    }
  }
  draw() {
    console.log(this.board);
  }
}


class Tile {
  constructor(top, right, bottom, left, center, background) {
    let tileTypes = ['grass', 'city', 'road', 'river', 'water'];
    let centerTypes = ['abbey', 'garden'];

    function standardizeTile(tile) {
      return (tileTypes.includes(tile) ? tile : tileTypes[getRandomInt(4)]);
    }

    this.top = standardizeTile(top);
    this.right = standardizeTile(right);
    this.bottom = standardizeTile(bottom);
    this.left = standardizeTile(left);
    this.background = standardizeTile(background);
    this.center = (centerTypes.includes(center) ? center : centerTypes[getRandomInt(6)]); //centerTypes[randomInt > centerTypes.length adds more chances for null center]
    this.rotated = 0;
    this.meeple = null;

    return this;
  }
  // matchThis is a 4 item array of tile types ['grass', 'city', 'grass', 'wildcard']
  // returns an array of possible rotations or false;
  match(matchThis) {
    let tileString = `'${this.top}','${this.right}','${this.bottom}','${this.left}','${this.top}','${this.right}','${this.bottom}'`;
    let proposedMatchString = ("'" + matchThis.join("','") + "'").replace(/\'wildcard\'/g, '(\'[^,]+\')');

    let re = new RegExp('(?=(' + proposedMatchString + '))', 'g');
    let result = Array.from(tileString.matchAll(re), x => x.index);
    result = result.map(x => (x != 0 ? tileString.slice(0, x).match(/,/g).length : 0));

    if(result.length > 0) {
      return result;
    } else {
      return false;
    }
  }
  rotateTile(matchThis = false) {
    if(matchThis) {
      let rotations = this.match(matchThis);
      let rotate = 0;
      if(rotations == false) {
        return false;
      }
      if(rotations[0] == 0 && rotations.length > 1) {
        rotate = 1;
      }
      for(let i = 1; i <= rotations[rotate]; i++) {
        this.rotateTile(); //rotate as much as needed
      }
      console.log(this.rotated);
      return this; //return a success? or failure?
    } else { //we rotate counter-clockwise
      //keep the meeple connected to it's place.
      let options = ['top', 'right', 'bottom', 'left'];
      if(this.meeple && this.meeple != ('center' || 'background')) {
        this.meeple = options[(options.indexOf(this.meeple) + 3) % 4];
      }
      let tmp = this.top;
      this.top = this.right;
      this.right = this.bottom;
      this.bottom = this.left;
      this.left = tmp;
      this.rotated = (1 + this.rotated) % 4; //rotate = 0 to 3

      return this;
    }
  }
}

//
// Asset loader
//

var Loader = {
  images: {}
};

Loader.loadImage = function(key, src) {
  var img = new Image();

  var d = new Promise(function(resolve, reject) {
    img.onload = function() {
      this.images[key] = img;
      resolve(img);
    }.bind(this);

    img.onerror = function() {
      reject('Could not load image: ' + src);
    };
  }.bind(this));

  img.src = src;
  return d;
};

Loader.getImage = function(key) {
  return (key in this.images) ? this.images[key] : null;
};

//
// Keyboard handler
//

var Keyboard = {};

Keyboard.LEFT = 37;
Keyboard.RIGHT = 39;
Keyboard.UP = 38;
Keyboard.DOWN = 40;

Keyboard._keys = {};

Keyboard.listenForEvents = function(keys) {
  window.addEventListener('keydown', this._onKeyDown.bind(this));
  window.addEventListener('keyup', this._onKeyUp.bind(this));

  keys.forEach(function(key) {
    this._keys[key] = false;
  }.bind(this));
}

Keyboard._onKeyDown = function(event) {
  var keyCode = event.keyCode;
  if(keyCode in this._keys) {
    event.preventDefault();
    this._keys[keyCode] = true;
  }
};

Keyboard._onKeyUp = function(event) {
  var keyCode = event.keyCode;
  if(keyCode in this._keys) {
    event.preventDefault();
    this._keys[keyCode] = false;
  }
};

Keyboard.isDown = function(keyCode) {
  if(!keyCode in this._keys) {
    throw new Error('Keycode ' + keyCode + ' is not being listened to');
  }
  return this._keys[keyCode];
};

//
// Game object
//

var Game = {};

Game.run = function(context) {
  this.ctx = context;
  this._previousElapsed = 0;

  var p = this.load();
  Promise.all(p).then(function(loaded) {
    this.init();
    window.requestAnimationFrame(this.tick);
  }.bind(this));
};

Game.tick = function(elapsed) {
  window.requestAnimationFrame(this.tick);

  // clear previous frame
  this.ctx.clearRect(0, 0, 512, 512);

  // compute delta time in seconds -- also cap it
  var delta = (elapsed - this._previousElapsed) / 1000.0;
  delta = Math.min(delta, 0.25); // maximum delta of 250 ms
  this._previousElapsed = elapsed;

  this.update(delta);
  this.render();
}.bind(Game);

// override these methods to create the demo
Game.init = function() {};
Game.update = function(delta) {};
Game.render = function() {};

//
// start up function
//

window.onload = function() {
  var context = document.getElementById('demo').getContext('2d');
  Game.run(context);
};

var map = {
  cols: 12,
  rows: 12,
  tsize: 104,
  layers: [
    [
      3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
      3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3,
      3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3,
      3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3,
      3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3,
      3, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 3,
      3, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 3,
      3, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 3,
      3, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 3,
      3, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 3,
      3, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 3,
      3, 3, 3, 1, 1, 2, 3, 3, 3, 3, 3, 3
    ],
    [
      4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4,
      4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4,
      4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4,
      4, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 4,
      4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4,
      4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4,
      4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4,
      4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4,
      4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4,
      4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4,
      4, 4, 4, 0, 5, 4, 4, 4, 4, 4, 4, 4,
      4, 4, 4, 0, 0, 3, 3, 3, 3, 3, 3, 3
    ]
  ],
  getTile: function(layer, col, row) {
    return this.layers[layer][row * map.cols + col];
  }
};

class Camera {
  constructor(map, width, height) {
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
    //-------------------------
    this.maxX = map.cols * map.tsize - width;
    this.maxY = map.rows * map.tsize - height;
    this.SPEED = 1024; // pixels per second
  }

  move(delta, dirx, diry) {
    // move camera
    this.x += dirx * this.SPEED * delta;
    this.y += diry * this.SPEED * delta;
    // clamp values
    this.x = Math.max(0, Math.min(this.x, this.maxX));
    this.y = Math.max(0, Math.min(this.y, this.maxY));
  };
}

Game.load = function() {
  return [
    Loader.loadImage('tiles', ' tilemap.png'),
  ];
};

Game.init = function() {
  Keyboard.listenForEvents(
    [Keyboard.LEFT, Keyboard.RIGHT, Keyboard.UP, Keyboard.DOWN]);
  this.tileAtlas = Loader.getImage('tiles');
  this.camera = new Camera(map, 512, 512);
};

Game.update = function(delta) {
  // handle camera movement with arrow keys
  var dirx = 0;
  var diry = 0;
  if(Keyboard.isDown(Keyboard.LEFT)) {
    dirx = -1;
  }
  if(Keyboard.isDown(Keyboard.RIGHT)) {
    dirx = 1;
  }
  if(Keyboard.isDown(Keyboard.UP)) {
    diry = -1;
  }
  if(Keyboard.isDown(Keyboard.DOWN)) {
    diry = 1;
  }

  this.camera.move(delta, dirx, diry);
};

Game._drawLayer = function(layer) {
  var startCol = Math.floor(this.camera.x / map.tsize);
  var endCol = startCol + (this.camera.width / map.tsize);
  var startRow = Math.floor(this.camera.y / map.tsize);
  var endRow = startRow + (this.camera.height / map.tsize);
  var offsetX = -this.camera.x + startCol * map.tsize;
  var offsetY = -this.camera.y + startRow * map.tsize;

  for(var c = startCol; c <= endCol; c++) {
    for(var r = startRow; r <= endRow; r++) {
      var tile = map.getTile(layer, c, r);
      var x = (c - startCol) * map.tsize + offsetX;
      var y = (r - startRow) * map.tsize + offsetY;
      if(tile !== 0) { // 0 => empty tile
        this.ctx.drawImage(
          this.tileAtlas, // image
          (tile - 1) * map.tsize, // source x
          0, // source y
          map.tsize, // source width
          map.tsize, // source height
          Math.round(x), // target x
          Math.round(y), // target y
          map.tsize, // target width
          map.tsize // target height
        );
      }
    }
  }
};

Game.render = function() {
  // draw map background layer
  this._drawLayer(0);
  // draw map top layer
  this._drawLayer(1);
};
