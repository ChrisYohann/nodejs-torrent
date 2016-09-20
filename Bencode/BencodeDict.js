var BencodeDict = module.exports = function BencodeDict() {
  Object.defineProperty(this,"content",{
    value : [],
    enumerable : false
  })
}

BencodeDict.prototype.getContent = function() {
  return this.content.slice()
}

BencodeDict.prototype.putContent = function(key,value) {
  this.content.push(key) ;
  this[key] = value ;
}

BencodeDict.prototype.toString = function(){

    var keySet = this.content ;
    var tree = "\tDictionary"+"["+keySet.length+"] : \n" ;

    keySet.sort()
    keySet.forEach(function(element,index,array){
      if(element != "pieces"){
        var value = this[element]
        if(Buffer.isBuffer(element)){
          var value_as_string = element.toString()
          tree+= "\t\t"+element+" : "+value_as_string+" \n" ;
        } else {
          tree += "\t\t"+element+" : "+value.toString()+" \n" ;
        }
      } else {
        tree += "\t\t"+element+" : ..." ;
      }
    },this);

  return tree
}
