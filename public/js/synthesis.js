const main = require('./main');


/// ------- BEGIN SYNTH CODE -------
// TODO refactor to new file - should stay on local side to allow it to work without a connection
// just dont get synthesis with no connection, but everythign else should work

function addLineForPointChange(currentCode,newNoteValue, rhythmIndex, instrumentIndex) {
    //generate new line for changed note
    newLine = "  b.rhythm" + (instrumentIndex+1) + "[" + rhythmIndex + "] = " + newNoteValue + ";\n"
    existingLineLoc = currentCode.indexOf("  b.rhythm" + (instrumentIndex+1) + "[" + rhythmIndex + "] =")
    //if code has a line explicitly changed this point, then we update its value
    if (existingLineLoc >=0) {
        var lineChPos = main.cmInstance.posFromIndex(existingLineLoc);
        var endReplacePos = JSON.parse(JSON.stringify(lineChPos));
        endReplacePos.ch = newLine.length+1;
        main.cmInstance
            .replaceRange(newLine.slice(0, -1), lineChPos, endReplacePos);
    }
    //else code currently has no effect on manually changed pattern, so we can just add a line
    else {
        main.cmInstance.replaceRange(newLine, {line: main.cmInstance.lineCount()-2, ch: 0})
    }
    return main.cmInstance.getValue();
}

function synthCode(newNoteValue, rhythmIndex, instrumentIndex) {
    //get current code
    var currentCode = main.cmInstance.getValue()

    var updatedCode = addLineForPointChange(currentCode,newNoteValue, rhythmIndex, instrumentIndex)

    socket.emit('code', {"code":updatedCode, "beat":theBeat});
    // TODO if we get new code any time, put it in the "proposed" box (or just replace existing code)

    socket.on('newCode', function(c) {
        main.cmInstance.replaceRange(c, {line: 2, ch:0}, {line: main.cmInstance.lineCount()-2, ch: 0});
    });
}



function updatePatternFromCode(){
    //every time we advance a time step, pull latest code and update beat object
    var updatedCode = main.cmInstance.getValue()
    try {
        //TODO if(codeChanged) {
        let f = new Function("theBeat", "rhythmIndex", '"use strict"; ' + updatedCode + ' return (genBeat(theBeat, rhythmIndex));');
        let newBeat = f(cloneBeat(theBeat), rhythmIndex);
        for (i = 1; i <= 6; i++) {
            newBeat['rhythm'+i.toString()] = newBeat['rhythm'+i.toString()].map((note) => {if (Number.isNaN(note)) {return 0;} else {return note}});
        }
        if (isValidBeat(newBeat)) { // && theBeat != newBeat){
            theBeat = newBeat;
            redrawAllNotes();
        }
    }
    catch(err) {

    }
}

// export {addLineForPointChange, synthCode, updatePatternFromCode}

exports.synthCode = synthCode;
exports.updatePatternFromCode = updatePatternFromCode;
exports.addLineForPointChange = addLineForPointChange;

//-------- END SYNTH CODE ----------
