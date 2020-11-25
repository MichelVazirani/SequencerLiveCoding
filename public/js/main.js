const drums = require('./drummachine');
const code = require('./codeManager');

window.onload = function(){
  var cmInstance = code.bootCodeMirror();
  exports.cmInstance = cmInstance;
  console.log(cmInstance)
  drums.initDrums();
}
