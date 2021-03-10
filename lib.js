function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
class Gameboard {
  //array of arrays is a list of rows that represent the board
  constructor(arrayOfArrays){
    console.log(arrayOfArrays);
    let board = [];
    for(const row of arrayOfArrays){
      let b_row = [];
      for(const column of row){
        //should we check that it's either null or a Tile object?
        b_row.push(column);
      }
      board.push(b_row);
    }
    this.board = board;
  }
  addTile(tile,row,column){
    this.board[row][column] = tile;
    
    //now make sure there is null tile before/after every actual tile.
    if(row == (this.board.length - 1)){ //add row after
      this.addRow();
    }
    if(column == (this.board[row].length - 1)){ //add column after
      this.addColumn();
    }
    if(row == 0){ //add a row before
      this.addRow(true);
    }
    if(column == 0){ //add a column before
      this.addColumn(true);
    }
    this.draw();
  }
  addRow(beginning=false){
    let row = [];
    for(const x of this.board[0]){
      row.push(null);
    }
    if(beginning){
      this.board.unshift(row);
    }
    else{
      this.board.push(row);
    }
  }
  addColumn(beginning=false){
    for(const row of this.board){
      if(beginning){
        row.unshift(null);  
      }
      else{
        row.push(null);
      }
    }
  }
  draw(){
    console.log(this.board);
  }
}


class Tile {
  constructor(top, right, bottom, left, center, background){
    let tileTypes = ['grass', 'city', 'road', 'river', 'water'];
    let centerTypes = ['abbey', 'garden', null, null];

    function standardizeTile(tile){
      return (tileTypes.includes(tile) ? tile : tileTypes[getRandomInt(4)]);
    }

    this.top = standardizeTile(top);
    this.right = standardizeTile(right);
    this.bottom = standardizeTile(bottom);
    this.left = standardizeTile(left);
    this.background = standardizeTile(background);
    this.center = (centerTypes.includes(center) ? center : centerTypes[getRandomInt(4)]);
    this.rotated = 0;
    this.meeple = null;

    return this;
  }
  // matchThis is a 4 item array of tile types ['grass', 'city', 'grass', 'wildcard']
  // returns an array of possible rotations or false;
  match(matchThis) {
    let tileString = `'${this.top}','${this.right}','${this.bottom}','${this.left}','${this.top}','${this.right}','${this.bottom}'`;
    let proposedMatchString = ("'"+matchThis.join("','")+"'").replace(/\'wildcard\'/g,'(\'[^,]+\')');

    let re = new RegExp('(?=('+proposedMatchString+'))','g');
    let result = Array.from(tileString.matchAll(re), x => x.index);
    result = result.map(x => (x != 0 ? tileString.slice(0, x).match(/,/g).length : 0));

    if(result.length > 0){
      return result;
    } else {
      return false;
    }
  }
  rotateTile(matchThis = false) {
    if(matchThis){
      let rotations = this.match(matchThis);
      let rotate = 0;
      if(rotations == false) {
        return false;
      }
      if(rotations[0] == 0 && rotations.length > 1){
        rotate = 1;
      }
      for(let i = 1; i <= rotations[rotate]; i++) {
        this.rotateTile(); //rotate as much as needed
      }
      console.log(this.rotated);
      return this; //return a success? or failure?
    }
    else {  //we rotate counter-clockwise
      //keep the meeple connected to it's place.
      let options = ['top','right','bottom','left'];
      if(this.meeple && this.meeple != ('center' || 'background')){
        this.meeple = options[(options.indexOf(this.meeple)+3)%4];
      }
      let tmp = this.top;
      this.top = this.right;
      this.right = this.bottom;
      this.bottom = this.left;
      this.left = tmp;
      this.rotated = (1+this.rotated)%4; //rotate = 0 to 3

      return this;
    }
  }
}