function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js', {
    scope: './'
  })
  .then((serviceWorker) => {
    console.log('service worker registration successful');
  })
  .catch((err) => {
    console.error('service worker registration failed');
    console.error(err);
  });
} else {
  console.log('service worker unavailable');
}

class Player {
  constructor(name, color, id){
    this.name = name;
    this.color = color;
    this.meeples = 7;
    this.abbot = 1;
    this.score = 0;

    let coloredMeepleImage = (new XMLSerializer).serializeToString(document.getElementById('meeple')).replace(/#fff/g,color);
    let coloredAbbotImage = (new XMLSerializer).serializeToString(document.getElementById('abbot')).replace(/#fff/g,color);
    let meepleSvg = new Blob([coloredMeepleImage], {type: "image/svg+xml"});
    let meepleUrl = URL.createObjectURL(meepleSvg);
    this.meepleImage = new Image(Game.tileSize/5,Game.tileSize/5);
    this.meepleImage.src = meepleUrl;
    let abbotSvg = new Blob([coloredAbbotImage], {type: "image/svg+xml"});
    let abbotUrl = URL.createObjectURL(abbotSvg);
    this.abbotImage = new Image(Game.tileSize/5,Game.tileSize/5);
    this.abbotImage.src = abbotUrl;
    this.playerID = id;
  }
  placeMeeple(placement) {
    this.meeples -= 1;
    return {name:this.name, type: 'meeple', playerID: this.playerID, placement:placement};
  }
  placeAbbot(placement) {
    this.abbot -= 1;
    return {name:this.name, type: 'abbot', playerID: this.playerID, placement:placement};
  }
  scoreMeeple(score) {
    this.meeples += 1;
    this.score += score;
  }
  scoreAbbot(score) {
    this.abbot += 1;
    this.score += score
  }
}
class Gameboard {
  //array of arrays is a list of rows that represent the board
  constructor(arrayOfArrays) {
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
    this.overlay = this.generateOverlay();
  }
  getEdges(row,column){
    let tileAbove = (row == 0 ? null : this.board[row - 1][column]);
    let tileRight = (column == this.board[row].length - 1 ? null : this.board[row][column+1]);
    let tileBottom = (row == this.board.length - 1 ? null : this.board[row + 1][column]);
    let tileLeft = (column == 0 ? null : this.board[row][column - 1]);
    let tileString = [(tileAbove ? tileAbove.bottom : 'wildcard'),
                      (tileRight ? tileRight.left : 'wildcard'),
                      (tileBottom ? tileBottom.top : 'wildcard'),
                      (tileLeft ? tileLeft.right : 'wildcard')];
    return tileString; 
  }
  setPossibleMeeple(tile,row,column){
    tile.possibleMeeple = [];
    let topMeeple = this.checkMeeple(tile.top,row-1,column, 'bottom'); //going to the top
    let rightMeeple = this.checkMeeple(tile.right,row,column+1, 'left'); //going to the right
    let bottomMeeple = this.checkMeeple(tile.bottom,row+1,column, 'top'); //going to the bottom
    let leftMeeple = this.checkMeeple(tile.left,row,column-1, 'right'); //going to the left
    topMeeple.direction = 'top';
    rightMeeple.direction = 'right';
    bottomMeeple.direction = 'bottom';
    leftMeeple.direction = 'left';

    let centerMeeple = {type:null,canMeeple:false};
    if(tile.center == 'abbey' || tile.center == 'garden' || tile.background == 'city'){
    	centerMeeple = {type: tile.center, canMeeple:true};
    }
    console.log(topMeeple,rightMeeple,bottomMeeple,leftMeeple,centerMeeple);
    //check for roads that are through
    let road_count = [topMeeple,rightMeeple,bottomMeeple,leftMeeple,centerMeeple].filter(edge => edge.type == 'road');
    if(road_count.length == 2 && tile.background == 'grass'){
    	//check to see if both roads are canMeeple, then add one meeple position
    	if(road_count.filter(edge => edge.canMeeple).length == 2) {
    		tile.possibleMeeple.push(road_count[0].direction);
    	}
    }
    else if(road_count.length > 0) {
    	for(const edge of road_count){ //put meeple possibility.
    		if(edge.canMeeple){
	        tile.possibleMeeple.push(edge.direction);
    		}
     	}
    }
    //cities that connect, then display appropriate meeples
    let city_count = [topMeeple,rightMeeple,bottomMeeple,leftMeeple,centerMeeple].filter(edge => edge.type == 'city' && edge.canMeeple);
    for(const edge of city_count) {
    	tile.possibleMeeple.push(edge.direction);
    }
    if(centerMeeple.canMeeple){
    	tile.possibleMeeple.push('center');
    }

    console.log(road_count);
  }
  checkMeeple(type,row,column,from){
  	console.log(type,row,column,from);
  	if(type != 'road' && type != 'city') {
  		console.log('not a road or city piece, so no possible meeples.')
  		return {type: type, canMeeple:false};  // only road and city edge pieces can hold meeple
  	}

  	let tile = Game.gameboard.board[row][column];
  	if(tile == null) { //no tile is placed, so it's all good!
  		console.log('there is no tile here, so yep! you can put a meeple if you would like to');
  	  return {type: type, canMeeple:true}; //this also fixes a potential infinite loop with a road that ends on the tile that is being placed.
  	}
  	else if(type == "road"){
  		if(tile.meeple && tile.meeple.placement == from){  //there's a meeple on the other side right away.
  			console.log('meeple on road next to previous tile');
  			return {type: type, canMeeple:false};
  		}
  		let road_count = (tile.top == "road") + (tile.right == "road") + (tile.bottom == "road") + (tile.left == "road");
  		if(road_count != 2){  // there was no meeple on the border and there are not only 2 roads on the tile;
  			console.log('there is no meeple next to previous tile and there are not only 2 roads on a grass backround');
        return {type: type, canMeeple:true};
  		}
  		else if(tile.background != 'grass'){ //if background is != grass, the road does not go through, and so we good
  			console.log('there is no meeple next to previous tile and background is not grass, so road cannot go through');
  			return {type: type, canMeeple:true};
  		}
  		else {  // we have a road that goes through on grass
  			let options = ['top', 'right', 'bottom', 'left'];
  			//find other road edge
  			let filtered_options = options.filter(item => item !== from);
  			for(const edge of filtered_options){
  				if(tile[edge] == 'road') { //we found the other edge
            if(tile.meeple && tile.meeple.placement == edge){
            	console.log('meeple was on the far side of the tile where the road exits');
            	return {type: type, canMeeple:false};
            }
            else { //we must check the next tile
            	let from = options[(options.indexOf(edge) + 2) % 4]; //find the opposite side of the edge
            	if(edge == 'top') {row -= 1 };
            	if(edge == 'right') {column += 1 };
            	if(edge == 'bottom') {row += 1 };
            	if(edge == 'left') {column -= 1 };

            	console.log("there's a through road and I'm following it to the next tile");
            	return this.checkMeeple('road', row, column, from); //let's run this function on the next tile.
            }
  				}
  			}
  		}
  	}
  	else if(type == "city"){  //we could get into a loop if we're not careful.

  		if(tile.meeple && tile.meeple.placement == from){ //there's a meeple on the other side
        console.log('meeple in city next to previous tile');
	      return {type: type, canMeeple:false};
  		}
  		else {
  			console.log('not sure and not checking if this city is meepleable right now... work on this later.');
  			return {type: type, canMeeple:true};
  		}
  		/*
  		//if city is on grass and there is no city edge either right or left, then we return true
  		else if(tile.background == 'grass'){
  			if((from == 'top' || from == 'bottom') && !(tile.right == 'city' || tile.left == 'city')){

  			}
  			else if((from == 'right' || from == 'left') && !(tile.top == 'city' || tile.bottom == 'city')){
  				
  			}
  			else { //we have a city piece next to us in one direction or another... check that one.
  				//first find the city piece

  			}
  		}

  		//if city is on grass and there's a proximate city edge we need to check that meeple position and follow to next tile

  		//if city is on city, then we need to check center meeple position and we need to check all edge city pieces's proximate tiles
*/
  	}
  	else {
  		console.log('not sure what\'s going on, soo... check this out');
  		return {type: type, canMeeple: true};
  	}

  }
  generateOverlay(tileToMatch){
    let overlay = [];
    for(let row = 0; row < this.board.length; row++) { 
      let o_row = [];
      for(let column = 0; column < this.board[row].length; column++) { 
        if(tileToMatch && this.board[row][column] == null){
          let tileString = this.getEdges(row,column);
          if(tileString.join("").replace(/wildcard/g, '') != '' && tileToMatch.match(tileString)){
            o_row.push('highlight');
          }
          else { 
            o_row.push(null);
          }
        }
        else {
          o_row.push(null);
        }
      }
      overlay.push(o_row);
    }
    this.overlay = overlay;
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
    let backgroundTypes = ['grass', 'city', 'water', 'mountain'];
    let edgeTypes = ['grass', 'city', 'water', 'mountain','road','river'];
    let centerTypes = ['abbey', 'garden'];

    function standardizeTile(tile) {
      return (edgeTypes.includes(tile) ? tile : edgeTypes[getRandomInt(6)]);
    }

    this.top = standardizeTile(top);
    this.right = standardizeTile(right);
    this.bottom = standardizeTile(bottom);
    this.left = standardizeTile(left);
    this.background = (backgroundTypes.includes(background) ? background : backgroundTypes[getRandomInt(4)]);
    if(this.background == 'grass'){
      this.center = (centerTypes.includes(center) ? center : centerTypes[getRandomInt(11)]); //centerTypes[randomInt > centerTypes.length adds more chances for null center]
    }
    if(this.background == 'city'){
      this.shield = ([0].indexOf(getRandomInt(9)) == 0 ? 1 : 0);
    }
    this.rotated = 0;
    this.meeple = null; //{type: , name: , placement: }

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
  rotateTile(matchThis = false, returnTile = false) {
    if(matchThis) {
      let rotations = this.match(matchThis);
      let rotate = 0;
      if(rotations == false && returnTile == false) {
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
      if(this.meeple && this.meeple.placement != ('center' || 'background')) {
        this.meeple.placement = options[(options.indexOf(this.meeple.placement) + 3) % 4];
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
// Touch handler
//

var Touch = {};

//document.addEventListener("touchstart", touchHandler);
document.addEventListener("touchstart", touchStart);
document.addEventListener("touchmove", touchMove);
document.addEventListener("touchend", touchEnd);

function touchStart(e) {
  Touch.startX = e.touches[0].pageX;
  Touch.startY = e.touches[0].pageY;
}
function touchMove(e) {
  if(e.touches) {
    Game.camera.touchMove(Touch.startX - e.touches[0].pageX, Touch.startY - e.touches[0].pageY);
  	Game.needsUpdate = true;
    Touch.startX = e.touches[0].pageX;
    Touch.startY = e.touches[0].pageY;
  }
}
function touchEnd(e) {
  if(e.touches) {
  
  }
}

window.addEventListener('keydown', function(event){ 
  if(event.key === "Escape") {
    let escapeMenuVis = !document.getElementById('escapeMenu').classList.contains('hideUp');
    let newGameMenuVis = !document.getElementById('newGame').classList.contains('hideIn');
    if(escapeMenuVis){
      hideEscapeMenu();
    }
    else if(newGameMenuVis){
      this.document.getElementById('newGame').classList.toggle('hideIn');
      showEscapeMenu();
    }
    else {
      showEscapeMenu();
    }
  }
});

window.addEventListener('click', function(event){
	Game.needsUpdate = true;
  if(Game.camera && event.target.id == 'gameboard'){
    let tileColumn = Math.floor((Game.camera.x+event.pageX)/Game.tileSize);
    let tileRow = Math.floor((Game.camera.y+event.pageY)/Game.tileSize);

    if(!Game.placeMeeple && Game.gameboard.overlay[tileRow][tileColumn] != null){
      document.getElementById('btm_right_close').classList.remove('hide');
      document.getElementById('btm_right_check').classList.remove('hide');
      Game.clickedPosition = {x: tileColumn, y: tileRow}

      if(Game.gameboard.overlay[tileRow][tileColumn] == 'highlight'){
        Game.gameboard.generateOverlay(Game.nextTile);
        Game.gameboard.overlay[tileRow][tileColumn] = Game.nextTile.rotateTile(Game.gameboard.getEdges(tileRow,tileColumn), true);
      }
      else if(Game.gameboard.overlay[tileRow][tileColumn] instanceof Tile){
        Game.gameboard.overlay[tileRow][tileColumn] = Game.nextTile.rotateTile(Game.gameboard.getEdges(tileRow,tileColumn), true); 
      }
    }
    else if(Game.placeMeeple && Game.gameboard.overlay[tileRow][tileColumn] instanceof Tile) { // if we are in meeple placement teritory.
    	//check if we are clicking near a possible meeple
      let tile = Game.gameboard.overlay[tileRow][tileColumn];
      let insideX = Game.camera.x+event.pageX - Game.tileSize*tileColumn; 
      let insideY = Game.camera.y+event.pageY - Game.tileSize*tileRow; 
      let tileSize = Game.tileSize;
      let placement = null;
      
      let sides = [{side: 'left',   distance:insideX},
                   {side: 'top',    distance:insideY},
                   {side: 'right',  distance:tileSize - insideX},
                   {side: 'bottom', distance:tileSize - insideY}].sort((a,b) => (a.distance > b.distance) ? 1 : -1);

      placement = sides[0].side;

      if(insideX > tileSize/3 && insideX < tileSize*2/3 && insideY > tileSize/3 && insideY < tileSize*2/3) {
        placement = 'center';
      }
      if(tile.possibleMeeple.indexOf(placement) > -1){
        tile.meeple = Game.players[Game.playerIndex].placeMeeple(placement);
      }
    }
  }
});

function showEscapeMenu(){
  this.document.getElementById('escapeMenu').classList.remove('hideUp');
  this.document.getElementById('touchEscape').classList.add('hideUp');
}
function hideEscapeMenu(){
  this.document.getElementById('escapeMenu').classList.add('hideUp');
  this.document.getElementById('touchEscape').classList.remove('hideUp');
}

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

Game.run = function(context, players) {
  this.ctx = context;
  this.backContext = document.createElement('canvas');
  this.tilePreview = document.getElementById('tile-preview').getContext('2d');
  this.cache = {};
  this._previousElapsed = 0;

  this.players = players;
  this.playerIndex = 0;

  this.placeMeeple = false;

  this.nextPlayer = function() {
    this.playerIndex = ((this.playerIndex + 1) % this.players.length);
    console.log(this.playerIndex);
  }

  var p = this.load();
  Promise.all(p).then(function(loaded) {
    this.init();
    window.requestAnimationFrame(this.tick);
  }.bind(this));
};

Game.tick = function(elapsed) {
  window.requestAnimationFrame(this.tick);

  // compute delta time in seconds -- also cap it
  var delta = (elapsed - this._previousElapsed) / 1000.0;
  delta = Math.min(delta, 0.25); // maximum delta of 250 ms
  this._previousElapsed = elapsed;

  this.update(delta);
  if(this.needsUpdate){
    // clear previous frame
    this.ctx.clearRect(0, 0, this.camera.width, this.camera.height);
    this.render();
  }
}.bind(Game);

// override these methods to create the demo
Game.init = function() {};
Game.update = function(delta) {};
Game.render = function() {};

//
// start up function
//
function newGame(){
  hideEscapeMenu();
  document.getElementById('newGame').classList.remove('hideIn');
  if(document.getElementById('newPlayers').children.length == 0){
    addPlayer();
  }
}

function addPlayer(){
  let colors = ["#d41818","#eadf47","#464fb3","#00f03c","#22deec"];
  let i = document.querySelectorAll('.newPlayer').length;
  document.getElementById('newPlayers').insertAdjacentHTML('beforeend', `
    <div class="newPlayer">
      <input class="name" type="text" placeholder="Name">
      <input class="color" type="color" value="${colors[i]}">
      <button class="btn_circ rotate" onclick="this.parentElement.remove();">
        <table class="plusIcon"><tr><td></td><td></td></tr><tr><td></td><td></td></tr></table>
      </button>
    </div>`);
}

function toggleRibbon(el) {
  el.classList.toggle('hide');
}

function startGame(){
  //clear old player ribbons if any
  document.querySelectorAll('.ribbon').forEach(function(el){
    el.remove();
  }); 
  //add players to the game
  let players = [];
  let playerEls = document.getElementById('newPlayers').children;

  for (var i = 0; i < playerEls.length; i++) {
    let color = playerEls[i].querySelector('.color').value;
    let name = playerEls[i].querySelector('.name').value;
    if(name.trim() == ''){ name = "Player "+(i+1) }

    let player = new Player(name,color, i);

    players.push(player);

    document.getElementById('gameUi').insertAdjacentHTML('beforeend', 
      `<div class="ribbon" id="${"player-"+i}" style="--bg-color: ${color}">
        <div class="inset"></div>
        <div class="container ${(i == 0 ? '' : 'hide')}" onclick="toggleRibbon(this);">
          <div class="base">
            <h2 style="margin-top: 0; padding-top: 1em;">${name}</h2>
            <h4 class="meeple"><img src="meeple2d.svg" style="width:1em;"> ${player.meeples}</h4>
            <h4 class="abbot"><img src="abbot2d.svg" style="width:1em;"> ${player.abbot}</h4>
            <h4 class="score">${player.score}</h4>
          </div>
          <div class="left_corner"></div>
          <div class="right_corner"></div>
        </div>
      </div>`);
  }

  //pause scollingBackground, and change UI elements
  document.getElementById('scrollingBackground').classList.add('paused');
  document.getElementById('newGame').classList.add('hideIn');
  document.getElementById('gameUi').classList.remove('hide');

  //startGame
  Game.run(document.getElementById('gameboard').getContext('2d'), players);
}

class Camera {
  constructor(centered) {
    if(centered){
      this.x = this.maxX/2;
      this.y = this.maxY/2;
    }
    else {
      this.x = 0;
      this.y = 0;
    }
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
  touchMove(amntx, amnty) {
    this.x += amntx;
    this.y += amnty;
    
    //clamp values
    this.x = Math.max(0, Math.min(this.x, this.maxX));
    this.y = Math.max(0, Math.min(this.y, this.maxY));
  }
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
  while(this.gameboard.board.length*Game.tileSize < window.screen.height) {
    this.gameboard.addRow();
    this.gameboard.addRow(true);
    this.gameboard.generateOverlay();
  }
  while(this.gameboard.board[0].length*Game.tileSize < window.screen.width) {
    this.gameboard.addColumn();
    this.gameboard.addColumn(true);
    this.gameboard.generateOverlay();
  }
  this.camera = new Camera(true);
  this.nextTile = new Tile();
  this.drawTile(this.nextTile,0,0,this.tilePreview);
  this.gameboard.generateOverlay(this.nextTile);

  let coloredMeepleImage = (new XMLSerializer).serializeToString(document.getElementById('meeple'));
  let coloredAbbotImage = (new XMLSerializer).serializeToString(document.getElementById('abbot'));
  var meepleSvg = new Blob([coloredMeepleImage], {type: "image/svg+xml"});
  var meepleUrl = URL.createObjectURL(meepleSvg);
  var abbotSvg = new Blob([coloredMeepleImage], {type: "image/svg+xml"});
  var abbotUrl = URL.createObjectURL(abbotSvg);
  this.meepleImage = new Image(Game.tileSize/5,Game.tileSize/5);
  this.meepleImage.src = meepleUrl;
  this.abbotImage = new Image(Game.tileSize/5,Game.tileSize/5);
  this.abbotImage.src = abbotUrl;

  this.needsUpdate = true;
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

  if(dirx != 0 || diry != 0) {
    this.needsUpdate = true;
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
      var overlay = this.gameboard.overlay[r][c];
      //console.log(tile);
      var x = (c - startCol) * Game.tileSize + offsetX;
      var y = (r - startRow) * Game.tileSize + offsetY;
      this.drawTile(tile, x, y, this.ctx, overlay);
    }
  }
}
function enterPlaceMeeple(){
	Game.needsUpdate = true;

  if(!Game.placeMeeple){
    Game.placeMeeple = true; 
    Game.gameboard.setPossibleMeeple(Game.gameboard.overlay[Game.clickedPosition.y][Game.clickedPosition.x], Game.clickedPosition.y,Game.clickedPosition.x);	
    if(Game.gameboard.overlay[Game.clickedPosition.y][Game.clickedPosition.x].possibleMeeple.length == 0){
			enterPlaceMeeple();
		}
	}
  else if(Game.placeMeeple){
		Game.placeMeeple = false;
		let tile = Game.gameboard.overlay[Game.clickedPosition.y][Game.clickedPosition.x];
		tile.possibleMeeple = null;
		Game.gameboard.addTile(tile,Game.clickedPosition.y, Game.clickedPosition.x);

		Game.nextTile = new Tile();
    Game.drawTile(Game.nextTile,0,0,Game.tilePreview);
    Game.gameboard.generateOverlay(Game.nextTile);
    document.querySelector('#player-'+Game.playerIndex+' .container').classList.add('hide');
    Game.nextPlayer();
    document.querySelector('#player-'+Game.playerIndex+' .container').classList.remove('hide');
    document.getElementById('btm_right_close').classList.add('hide');
    document.getElementById('btm_right_check').classList.add('hide');
	}
	
}
function leavePlaceMeeple(){
  if(Game.placeMeeple){
  	Game.placeMeeple = false;
    Game.gameboard.overlay[Game.clickedPosition.y][Game.clickedPosition.x].possibleMeeple = null;
  	Game.gameboard.overlay[Game.clickedPosition.y][Game.clickedPosition.x].meeple = null;
  }
  else {
    Game.gameboard.overlay[Game.clickedPosition.y][Game.clickedPosition.x] = null;
    Game.gameboard.generateOverlay(Game.nextTile);
    document.getElementById('btm_right_close').classList.add('hide');
    document.getElementById('btm_right_check').classList.add('hide');
  }
  Game.needsUpdate = true;
}
Game.drawTile = function(tile, x, y, context, overlay) {
  if(tile == null) { // null => empty tile
    if(!(overlay instanceof Tile)) { //draw background wood pattern
      drawSprite(context,8,1,0)
    }
    else if(overlay instanceof Tile) { //draw highlights and or / partially placed tile if exists.
      Game.drawTile(overlay,x,y,context);
      //drawSprite(context, 8, 2, 2);
      if(!Game.placeMeeple && overlay.match(Game.gameboard.getEdges(Game.clickedPosition.y,Game.clickedPosition.x)).length > 1){
        drawSprite(context, 8, 4, -overlay.rotated*90);
      }
    }
    if(!Game.placeMeeple && overlay == 'highlight'){
      drawSprite(context, 8, 2, 0);
    }
    if(!Game.placeMeeple && overlay instanceof Tile){
      drawSprite(context, 8, 3, 0);
    }
  }
  else {
    //first draw background
    let backgroundTypes = ['grass', 'city', 'water', 'mountain'];
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

    //draw the shield tiles
    if(tile.shield){
      drawSprite(context, 8, 0, -tile.rotated*90);
    }

    //draw meeples
    if(tile.possibleMeeple && tile.possibleMeeple.length > 0){
	    for(const place of tile.possibleMeeple){
	    	drawMeeple(context, place, Game.meepleImage);
	    }	
    }
    if(tile.meeple){
    	drawMeeple(context, tile.meeple.placement, Game.players[tile.meeple.playerID].meepleImage);
    }
  }
  function drawMeeple(context, placement, meepleImage){
  	let tx = Math.round(x);
  	let ty = Math.round(y);
  	
  	if(placement == 'top'){
  		tx += Game.tileSize/2 - Game.tileSize/5/2;
  		ty += Game.tileSize/20;    
  	}
  	else if(placement == 'right'){
  		tx += Game.tileSize - Game.tileSize/20 - Game.tileSize/5;
  		ty += Game.tileSize/2 - Game.tileSize/5/2;    
  	}
  	else if(placement == 'bottom'){
  		tx += Game.tileSize/2 - Game.tileSize/5/2;
  		ty += Game.tileSize - Game.tileSize/20 - Game.tileSize/5;
  	}
  	else if(placement == 'left'){
  		tx += Game.tileSize/20;
  		ty += Game.tileSize/2 - Game.tileSize/5/2; 
  	}
  	else if(placement == 'center'){
  		tx += Game.tileSize/2 - Game.tileSize/5/2;
  		ty += Game.tileSize/2 - Game.tileSize/5/2;
  	}
  	context.drawImage(
  		meepleImage,
  		tx, //target x
  		ty, //target y
  		Game.tileSize/5, //target width  
  		Game.tileSize/5  //target height
		);
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
  //this._drawLayer(1);
  this.needsUpdate = false;
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
