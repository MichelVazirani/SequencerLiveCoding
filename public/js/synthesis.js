//We pull this in on init, which allows us to grab code as the drum machine runs
var codeMirrorInstance = null

var mostRecentCode;

function setCMInstance (cm) {
    codeMirrorInstance = cm;
    mostRecentCode = codeMirrorInstance.getValue()

}

function addLineForPointChange(currentCode,newNoteValue, rhythmIndex, instrumentIndex) {
    //generate new line for changed note
    newLine = "  b.rhythm" + (instrumentIndex+1) + "[" + rhythmIndex + "] = " + newNoteValue + ";\n"
    existingLineLoc = currentCode.indexOf("  b.rhythm" + (instrumentIndex+1) + "[" + rhythmIndex + "] =")
    //if code has a line explicitly changed this point, then we update its value
    if (existingLineLoc >=0) {
        var lineChPos = codeMirrorInstance.posFromIndex(existingLineLoc);
        var endReplacePos = JSON.parse(JSON.stringify(lineChPos));
        endReplacePos.ch = newLine.length+1;
        codeMirrorInstance
            .replaceRange(newLine.slice(0, -1), lineChPos, endReplacePos);
    }
    //else code currently has no effect on manually changed pattern, so we can just add a line
    else {
        codeMirrorInstance.replaceRange(newLine, {line: codeMirrorInstance.lineCount()-2, ch: 0})
    }
    return codeMirrorInstance.getValue();
}

function synthCode(newNoteValue, rhythmIndex, instrumentIndex, theBeat) {
    //get current code
    var currentCode = codeMirrorInstance.getValue()

    var updatedCode = addLineForPointChange(currentCode,newNoteValue, rhythmIndex, instrumentIndex)

    socket.emit('code', {"code":updatedCode, "beat":theBeat});

    // currently, if we get new code any time, we replace code with synthesized code
    // TODO we need something a bit more tasteful - e.g. put new code in a "proposed change" box
    socket.on('newCode', function(c) {
        codeMirrorInstance.replaceRange(c, {line: 2, ch:0}, {line: codeMirrorInstance.lineCount()-2, ch: 0});
    });
}

function updatePatternFromCode(currentBeat, rhythmIndex){
    //every time we advance a time step, pull latest code and update beat object
    var updatedCode = codeMirrorInstance.getValue()
    try {
        if (updatedCode != mostRecentCode){
          mostRecentCode = updatedCode;
          let f = new Function("theBeat", "rhythmIndex", '"use strict"; ' + updatedCode + ' return (genBeat(theBeat, rhythmIndex));');
          let newBeat = f(currentBeat, rhythmIndex);
          for (i = 1; i <= 6; i++) {
              newBeat['rhythm'+i.toString()] = newBeat['rhythm'+i.toString()].map((note) => {if (Number.isNaN(note)) {return 0;} else {return note}});
          }
          if (isValidBeat(newBeat)) { // && theBeat != newBeat){
              return newBeat;
          }
        }
    }
    catch(err) {
      console.log("updatePatternFromCode error")
      console.log(err)
    }
    return null;
}

function isValidBeat(beat) {

    var valid = true;
    for (i = 1; i <= 6; i++) {
        valid = valid &&
            Array.isArray(beat['rhythm'+i.toString()]) &&
            beat['rhythm'+i.toString()].every((v) => v <=2 && v >=0);
    }
    // console.log(valid);
    return valid;
}


exports.setCMInstance = setCMInstance
exports.synthCode = synthCode
exports.updatePatternFromCode = updatePatternFromCode

//
