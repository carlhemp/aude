function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
class Gameboard {
  //array of arrays is a list of rows that represent the board
  constructor(arrayOfArrays) {
    console.log(arrayOfArrays);
    if(arrayOfArrays == null){
      arrayOfArrays = [[null]];
    }
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
    console.log(board);
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
    //console.log(this.board);
  }
}


class Tile {
  constructor(top, right, bottom, left, center, background, shield) {
    let backgroundTypes = ['grass', 'city', 'water'];
    let edgeTypes = ['grass', 'city', 'water', 'mountain','road','river'];
    let centerTypes = ['abbey', 'garden'];

    function standardizeTile(tile) {
      return (edgeTypes.includes(tile) ? tile : edgeTypes[getRandomInt(6)]);
    }

    this.top = standardizeTile(top);
    this.right = standardizeTile(right);
    this.bottom = standardizeTile(bottom);
    this.left = standardizeTile(left);
    this.background = (backgroundTypes.includes(background) ? background : backgroundTypes[getRandomInt(3)]);
    if(this.background == 'grass'){
      this.center = (centerTypes.includes(center) ? center : centerTypes[getRandomInt(11)]); //centerTypes[randomInt > centerTypes.length adds more chances for null center]
    }
    if(this.background == 'city'){
      this.shield = ([0].indexOf(getRandomInt(9)) == 0 ? 1 : 0);
    }
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
  this.backContext = document.createElement('canvas');
  this.tilePreview = document.getElementById('tile-preview').getContext('2d');
  this.cache = {};
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
  var context = document.getElementById('gameboard').getContext('2d');
  Game.run(context);
};

class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    //-------------------------
    this.SPEED = 1024; // pixels per second
  }
  get width() { return window.innerWidth; }
  get height() { return window.innerHeight; }
  get maxX() {
    return Game.gameboard.board[0].length * Game.tileSize - this.width;
  }
  get maxY() {
    return Game.gameboard.board.length * Game.tileSize - this.height;
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
  Keyboard.listenForEvents([Keyboard.LEFT, Keyboard.RIGHT, Keyboard.UP, Keyboard.DOWN]);
  this.tileAtlas = Loader.getImage('tiles');
  this.tileSize = 104;
  this.gameboard = new Gameboard([[null,null],[null,null]]);
  for(let i=1; i < 2; i++){
    for(let j=1; j < 2; j++){
      this.gameboard.addTile(new Tile(), i, j);
    }
  }
  this.camera = new Camera();
  this.drawTile(new Tile(),0,0,this.tilePreview);
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
  var startCol = Math.floor(this.camera.x / Game.tileSize);
  var endCol = Math.min(startCol + (this.camera.width / Game.tileSize) + 1, Game.gameboard.board[0].length -1 );
  var startRow = Math.floor(this.camera.y / Game.tileSize);
  var endRow = Math.min(startRow + (this.camera.height / Game.tileSize) + 1,Game.gameboard.board.length - 1);
  var offsetX = -this.camera.x + startCol * Game.tileSize;
  var offsetY = -this.camera.y + startRow * Game.tileSize;

  for(var c = startCol; c <= endCol; c++) {
    for(var r = startRow; r <= endRow; r++) {
      var tile = this.gameboard.board[r][c];
      //console.log(tile);
      var x = (c - startCol) * Game.tileSize + offsetX;
      var y = (r - startRow) * Game.tileSize + offsetY;
      this.drawTile(tile, x, y, this.ctx);
    }
  }
}

Game.drawTile = function(tile, x, y, context) {
  if(tile == null) { // null => empty tile
    drawSprite(context,8,1,0);
  }
  else {
    //first draw background
    let backgroundTypes = ['grass', 'city', 'water'];
    let background = backgroundTypes.indexOf(tile.background);

    drawSprite(context,null,background,-tile.rotated*90);
    
    //then draw edge tiles
    let edgeTypes = ['grass', 'city', 'water', 'mountain','road','river'];

    let top = edgeTypes.indexOf(tile.top);
    let right = edgeTypes.indexOf(tile.right);
    let bottom = edgeTypes.indexOf(tile.bottom);
    let left = edgeTypes.indexOf(tile.left);

    drawSprite(context, top, background, 0);
    drawSprite(context, right, background, 90);
    drawSprite(context, bottom, background, 180);
    drawSprite(context, left, background, 270);

    //then draw diagonals and through
    if(background == edgeTypes.indexOf('grass')){
      if(top == right) { drawSprite(context,top,4,0) }
      if(right == bottom) { drawSprite(context,right,4,90) }
      if(bottom == left) { drawSprite(context,bottom,4,180) }
      if(left == top) { drawSprite(context,left,4,270) }

      if(top == bottom && top != left && top != right) { 
        if(tile.center){
          drawSprite(context,top,4,0);
          drawSprite(context,top,4,90);
          drawSprite(context,top,4,180);
          drawSprite(context,top,4,270);
        }
        else{
          drawSprite(context,top,6,(tile.rotated >= 2 ? -180 : 0)) 
        }
      }
      if(left == right && left != top && left != bottom ) { 
        if(tile.center){
          drawSprite(context,left,4,0);
          drawSprite(context,left,4,90);
          drawSprite(context,left,4,180);
          drawSprite(context,left,4,270);
        }
        else{
          drawSprite(context,left,6,(tile.rotated >= 2 ? -270 : -90)) 
        }
      }
    }

    //then draw center tiles
    let center = ['abbey','garden'].indexOf(tile.center);
    (center > -1 ? center += 6 : center = 0)
    if(center){
      drawSprite(context, center, 0, -tile.rotated*90);
    }

    //finally draw the shield tiles
    if(tile.shield){
      drawSprite(context, 8, 0, -tile.rotated*90);
    }
  }
  function drawSprite(context, tile, background, rotation){
    if(tile != background || background > 3 || tile == null){
      if(tile == null){ tile = background }
      context.drawImage(
        rotateFlip(Game.backContext, 
          Game.tileAtlas,
          (background + 1) * Game.tileSize, // source x
          (tile + 1) * Game.tileSize, // source y
          rotation, 0),
        0,
        0,
        Game.tileSize, // source width
        Game.tileSize, // source height
        Math.round(x), // target x
        Math.round(y), // target y
        Game.tileSize, // target width
        Game.tileSize // target height
      );
    }
  }
}

Game.render = function() {
  this.ctx.canvas.width  = window.innerWidth;
  this.ctx.canvas.height = window.innerHeight;
  // draw map background layer
  this._drawLayer(0);
  // draw map top layer
  this._drawLayer(1);
};

function rotateFlip(backCon, image,tileX,tileY,rotate, flip){
  let tileSize = Game.tileSize;
  let cache = Game.cache;

  //check if we have a cache of the rotation and flip
  let cache_item = cache[tileX+""+tileY+""+rotate+""+flip];
  if(cache_item){
    return cache_item;
  }

  let backContext = backCon.getContext('2d');

  backContext.clearRect(0, 0, tileSize, tileSize);
  backContext.save();

  /*if(flip == 'horizontal' || flip == 'vertical') {
    backContext.save();
    var horScale = 0;
    var verScale = 0;
    var spriteXDirection = 1;
    var spriteYDirection = 1;

    if(flip == "horizontal") {
      horScale = tileSize;
      spriteXDirection = -1;
    }

    if(flip == "vertical" ) {
      verScale = height;
      spriteYDirection = -1;
    }

    backContext.translate(horScale, verScale);
    backContext.scale(spriteXDirection, spriteYDirection);
  }*/

  if(rotate){
    let radians = (Math.PI/180)*rotate;

    backContext.translate(tileSize/2,tileSize/2);
    backContext.rotate(radians);
    backContext.translate(-tileSize/2,-tileSize/2);
  }

  //draw the sprite not we always use 0,0 for top/left
  backContext.drawImage(image,
                        tileX,
                        tileY,
                        tileSize,
                        tileSize, 0, 0, tileSize, tileSize);

  //flip the back context back to center - or not, I haven't decided how to optimize this yet.
  backContext.restore();
  //store rotation and flip in cache
  cache[tileX+""+tileY+""+rotate+""+flip] = cloneCanvas(backCon);
  return backCon;
}

function cloneCanvas(oldCanvas) {
  //create a new canvas
  var newCanvas = document.createElement('canvas');
  var context = newCanvas.getContext('2d');

  //set dimensions
  newCanvas.width = oldCanvas.width;
  newCanvas.height = oldCanvas.height;

  //apply the old canvas to the new one
  context.drawImage(oldCanvas, 0, 0);

  //return the new canvas
  return newCanvas;
}
