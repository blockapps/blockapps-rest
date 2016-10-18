String.prototype.hexEncode8 = function(){
    var hex, i;
    var result = "";
    for (i=0; i<this.length; i++) {
        hex = this.charCodeAt(i).toString(16);
        result += ("0"+hex).slice(-2);
    }
    return result
}

String.prototype.hexDecode8 = function(){
    var j;
    var hexes = this.match(/.{1,2}/g) || [];
    var back = "";
    for(j = 0; j<hexes.length; j++) {
        back += String.fromCharCode(parseInt(hexes[j], 16));
    }
    return back;
}

module.exports = {
    fromSolidity: function(x){
      if(x)
        return x.split('0').join('').hexDecode8();
      else
        return undefined;
    },

    toSolidity: function(x){
      if(x)
        return ("0".repeat(64)+x.hexEncode8()).slice(-64);
      else
        return undefined;
    }
}
