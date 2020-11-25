const drums = require('./drummachine')
const irMod = require('./impulseResponse')
const midiMod = require('./midi')


var mouseCapture = null;
var mouseCaptureOffset = 0;

function handleSliderMouseDown(event) {
    mouseCapture = event.target.id;

    // calculate offset of mousedown on slider
    var el = event.target;
    if (mouseCapture == 'swing_thumb') {
        var thumbX = 0;
        do {
            thumbX += el.offsetLeft;
        } while (el = el.offsetParent);

        mouseCaptureOffset = event.pageX - thumbX;
    } else {
        var thumbY = 0;
        do {
            thumbY += el.offsetTop;
        } while (el = el.offsetParent);

        mouseCaptureOffset = event.pageY - thumbY;
    }
}

function handleSliderDoubleClick(event) {
    var id = event.target.id;
    if (id != 'swing_thumb' && id != 'effect_thumb') {
        mouseCapture = null;
        sliderSetValue(event.target.id, 0.5);
        drums.updateControls();
    }
}

function handleMouseMove(event) {
    if (!mouseCapture) return;

    var elThumb = document.getElementById(mouseCapture);
    var elTrack = elThumb.parentNode;

    if (mouseCapture != 'swing_thumb') {
        var thumbH = elThumb.clientHeight;
        var trackH = elTrack.clientHeight;
        var travelH = trackH - thumbH;

        var trackY = 0;
        var el = elTrack;
        do {
            trackY += el.offsetTop;
        } while (el = el.offsetParent);

        var offsetY = Math.max(0, Math.min(travelH, event.pageY - mouseCaptureOffset - trackY));
        var value = 1.0 - offsetY / travelH;
        elThumb.style.top = travelH * (1.0 - value) + 'px';
    } else {
        var thumbW = elThumb.clientWidth;
        var trackW = elTrack.clientWidth;
        var travelW = trackW - thumbW;

        var trackX = 0;
        var el = elTrack;
        do {
            trackX += el.offsetLeft;
        } while (el = el.offsetParent);

        var offsetX = Math.max(0, Math.min(travelW, event.pageX - mouseCaptureOffset - trackX));
        var value = offsetX / travelW;
        elThumb.style.left = travelW * value + 'px';
    }

    sliderSetValue(mouseCapture, value);
}

function handleMouseUp() {
    mouseCapture = null;
}

function sliderSetValue(slider, value) {
    var pitchRate = Math.pow(2.0, 2.0 * (value - 0.5));

    switch(slider) {
    case 'effect_thumb':
        // Change the volume of the convolution effect.
        drums.theBeat.effectMix = value;
        setEffectLevel(drums.theBeat);
        break;
    case 'kick_thumb':
        drums.theBeat.kickPitchVal = value;
        kickPitch = pitchRate;
        break;
    case 'snare_thumb':
        drums.theBeat.snarePitchVal = value;
        snarePitch = pitchRate;
        break;
    case 'hihat_thumb':
        drums.theBeat.hihatPitchVal = value;
        hihatPitch = pitchRate;
        break;
    case 'tom1_thumb':
        drums.theBeat.tom1PitchVal = value;
        tom1Pitch = pitchRate;
        break;
    case 'tom2_thumb':
        drums.theBeat.tom2PitchVal = value;
        tom2Pitch = pitchRate;
        break;
    case 'tom3_thumb':
        drums.theBeat.tom3PitchVal = value;
        tom3Pitch = pitchRate;
        break;
    case 'swing_thumb':
        drums.theBeat.swingFactor = value;
        break;
    }
}

function sliderSetPosition(slider, value) {
    var elThumb = document.getElementById(slider);
    var elTrack = elThumb.parentNode;

    if (slider == 'swing_thumb') {
        var thumbW = elThumb.clientWidth;
        var trackW = elTrack.clientWidth;
        var travelW = trackW - thumbW;

        elThumb.style.left = travelW * value + 'px';
    } else {
        var thumbH = elThumb.clientHeight;
        var trackH = elTrack.clientHeight;
        var travelH = trackH - thumbH;

        elThumb.style.top = travelH * (1.0 - value) + 'px';
    }
}

function handleButtonMouseDown(event) {
    var notes = drums.theBeat.rhythm1;

    var instrumentIndex;
    var rhythmIndex;

    var elId = event.target.id;
    rhythmIndex = elId.substr(elId.indexOf('_') + 1, 2);
    instrumentIndex = instruments.indexOf(elId.substr(0, elId.indexOf('_')));

    switch (instrumentIndex) {
        case 0: notes = drums.theBeat.rhythm1; break;
        case 1: notes = drums.theBeat.rhythm2; break;
        case 2: notes = drums.theBeat.rhythm3; break;
        case 3: notes = drums.theBeat.rhythm4; break;
        case 4: notes = drums.theBeat.rhythm5; break;
        case 5: notes = drums.theBeat.rhythm6; break;
    }

    var newNoteValue = (notes[rhythmIndex] + 1) % 3;

    notes[rhythmIndex] = newNoteValue

    if (instrumentIndex == currentlyActiveInstrument)
        showCorrectNote( rhythmIndex, notes[rhythmIndex] );

    drawNote(notes[rhythmIndex], rhythmIndex, instrumentIndex);

    if (newNoteValue) {
        switch(instrumentIndex) {
        case 0:  // Kick
          playNote(currentKit.kickBuffer, false, 0,0,-2, 0.5 * drums.theBeat.effectMix, volumes[newNoteValue] * 1.0, kickPitch, 0);
          break;

        case 1:  // Snare
          playNote(currentKit.snareBuffer, false, 0,0,-2, drums.theBeat.effectMix, volumes[newNoteValue] * 0.6, snarePitch, 0);
          break;

        case 2:  // Hihat
          // Pan the hihat according to sequence position.
          playNote(currentKit.hihatBuffer, true, 0.5*rhythmIndex - 4, 0, -1.0, drums.theBeat.effectMix, volumes[newNoteValue] * 0.7, hihatPitch, 0);
          break;

        case 3:  // Tom 1
          playNote(currentKit.tom1, false, 0,0,-2, drums.theBeat.effectMix, volumes[newNoteValue] * 0.6, tom1Pitch, 0);
          break;

        case 4:  // Tom 2
          playNote(currentKit.tom2, false, 0,0,-2, drums.theBeat.effectMix, volumes[newNoteValue] * 0.6, tom2Pitch, 0);
          break;

        case 5:  // Tom 3
          playNote(currentKit.tom3, false, 0,0,-2, drums.theBeat.effectMix, volumes[newNoteValue] * 0.6, tom3Pitch, 0);
          break;
        }
    }

    synthmod.synthCode(newNoteValue, rhythmIndex, instrumentIndex)
}

function handleKitComboMouseDown(event) {
    document.getElementById('kitcombo').classList.toggle('active');
}

function handleKitMouseDown(event) {
    var index = kitNamePretty.indexOf(event.target.innerHTML);
    drums.theBeat.kitIndex = index;
    currentKit = kits[index];
    document.getElementById('kitname').innerHTML = kitNamePretty[index];
}

function handleBodyMouseDown(event) {
    var elKitcombo = document.getElementById('kitcombo');
    var elEffectcombo = document.getElementById('effectcombo');

    if (elKitcombo.classList.contains('active') && !isDescendantOfId(event.target, 'kitcombo_container')) {
        elKitcombo.classList.remove('active');
        if (!isDescendantOfId(event.target, 'effectcombo_container')) {
            event.stopPropagation();
        }
    }

    if (elEffectcombo.classList.contains('active') && !isDescendantOfId(event.target, 'effectcombo')) {
        elEffectcombo.classList.remove('active');
        if (!isDescendantOfId(event.target, 'kitcombo_container')) {
            event.stopPropagation();
        }
    }
}















function handleEffectComboMouseDown(event) {
    if (event.target.id != 'effectlist') {
        document.getElementById('effectcombo').classList.toggle('active');
    }
}

function handleEffectMouseDown(event) {
    for (var i = 0; i < irMod.impulseResponseInfoList.length; ++i) {
        if (irMod.impulseResponseInfoList[i].name == event.target.innerHTML) {

            // Hack - if effect is turned all the way down - turn up effect slider.
            // ... since they just explicitly chose an effect from the list.
            if (drums.theBeat.effectMix == 0)
                drums.theBeat.effectMix = 0.5;

            setEffect(i);
            break;
        }
    }
}

function setEffect(index) {
    if (index > 0 && !irMod.impulseResponseList[index].isLoaded()) {
        alert('Sorry, this effect is still loading.  Try again in a few seconds :)');
        return;
    }

    drums.theBeat.effectIndex = index;
    effectDryMix = irMod.impulseResponseInfoList[index].dryMix;
    effectWetMix = irMod.impulseResponseInfoList[index].wetMix;
    convolver.buffer = irMod.impulseResponseList[index].buffer;

  // Hack - if the effect is meant to be entirely wet (not unprocessed signal)
  // then put the effect level all the way up.
    if (effectDryMix == 0)
        drums.theBeat.effectMix = 1;

    setEffectLevel(drums.theBeat);
    sliderSetValue('effect_thumb', drums.theBeat.effectMix);
    drums.updateControls();

    document.getElementById('effectname').innerHTML = irMod.impulseResponseInfoList[index].name;
}

function setEffectLevel() {
    // Factor in both the preset's effect level and the blending level (effectWetMix) stored in the effect itself.
    effectLevelNode.gain.value = drums.theBeat.effectMix * effectWetMix;
}


function handleDemoMouseDown(event) {
    var loaded = false;

    switch(event.target.id) {
        case 'demo1':
            loaded = loadBeat(beatDemo[0]);
            break;
        case 'demo2':
            loaded = loadBeat(beatDemo[1]);
            break;
        case 'demo3':
            loaded = loadBeat(beatDemo[2]);
            break;
        case 'demo4':
            loaded = loadBeat(beatDemo[3]);
            break;
        case 'demo5':
            loaded = loadBeat(beatDemo[4]);
            break;
    }

    if (loaded)
        handlePlay();
}

function handlePlay(event) {
    noteTime = 0.0;
    startTime = context.currentTime + 0.005;
    schedule();
    timerWorker.postMessage("start");

    document.getElementById('play').classList.add('playing');
    document.getElementById('stop').classList.add('playing');
    if (midiOut) {
        // turn off the play button
        midiOut.send( [0x80, 3, 32] );
        // light up the stop button
        midiOut.send( [0x90, 7, 1] );
    }
}

function handleStop(event) {
    timerWorker.postMessage("stop");

    var elOld = document.getElementById('LED_' + (drums.rhythmIndex + 14) % 16);
    elOld.src = 'images/LED_off.png';

    midiMod.hideBeat( (drums.rhythmIndex + 14) % 16 );

    drums.rhythmIndex = 0;

    document.getElementById('play').classList.remove('playing');
    document.getElementById('stop').classList.remove('playing');
    if (midiOut) {
        // light up the play button
        midiOut.send( [0x90, 3, 32] );
        // turn off the stop button
        midiOut.send( [0x80, 7, 1] );
    }
}

function handleSave(event) {
    toggleSaveContainer();
    var elTextarea = document.getElementById('save_textarea');
    elTextarea.value = JSON.stringify(drums.theBeat);
}

function handleSaveOk(event) {
    toggleSaveContainer();
}

function handleLoad(event) {
    toggleLoadContainer();
}

function handleLoadOk(event) {
    var elTextarea = document.getElementById('load_textarea');
    drums.theBeat = JSON.parse(elTextarea.value);

    // Set drumkit
    currentKit = kits[drums.theBeat.kitIndex];
    document.getElementById('kitname').innerHTML = kitNamePretty[drums.theBeat.kitIndex];

    // Set effect
    setEffect(drums.theBeat.effectIndex);

    // Change the volume of the convolution effect.
    setEffectLevel(drums.theBeat);

    // Apply values from sliders
    sliderSetValue('effect_thumb', drums.theBeat.effectMix);
    sliderSetValue('kick_thumb', drums.theBeat.kickPitchVal);
    sliderSetValue('snare_thumb', drums.theBeat.snarePitchVal);
    sliderSetValue('hihat_thumb', drums.theBeat.hihatPitchVal);
    sliderSetValue('tom1_thumb', drums.theBeat.tom1PitchVal);
    sliderSetValue('tom2_thumb', drums.theBeat.tom2PitchVal);
    sliderSetValue('tom3_thumb', drums.theBeat.tom3PitchVal);
    sliderSetValue('swing_thumb', drums.theBeat.swingFactor);

    // Clear out the text area post-processing
    elTextarea.value = '';

    toggleLoadContainer();
    drums.updateControls();
}

function handleLoadCancel(event) {
    toggleLoadContainer();
}

function toggleSaveContainer() {
    document.getElementById('pad').classList.toggle('active');
    document.getElementById('params').classList.toggle('active');
    document.getElementById('tools').classList.toggle('active');
    document.getElementById('save_container').classList.toggle('active');
}

function toggleLoadContainer() {
    document.getElementById('pad').classList.toggle('active');
    document.getElementById('params').classList.toggle('active');
    document.getElementById('tools').classList.toggle('active');
    document.getElementById('load_container').classList.toggle('active');
}

function handleReset(event) {
    handleStop();
    loadBeat(beat_profs.beatReset);
}







exports.handleSliderMouseDown = handleSliderMouseDown
exports.handleSliderDoubleClick = handleSliderDoubleClick
exports.handleMouseMove = handleMouseMove
exports.handleMouseUp = handleMouseUp
exports.sliderSetValue = sliderSetValue
exports.sliderSetPosition = sliderSetPosition
exports.handleButtonMouseDown = handleButtonMouseDown
exports.handleKitComboMouseDown = handleKitComboMouseDown
exports.handleKitMouseDown = handleKitMouseDown
exports.handleBodyMouseDown = handleBodyMouseDown
exports.handleEffectComboMouseDown = handleEffectComboMouseDown
exports.handleEffectMouseDown = handleEffectMouseDown
exports.setEffect = setEffect
exports.setEffectLevel = setEffectLevel
exports.handleDemoMouseDown = handleDemoMouseDown
exports.handlePlay = handlePlay
exports.handleStop = handleStop
exports.handleSave = handleSave
exports.handleSaveOk = handleSaveOk
exports.handleLoad = handleLoad
exports.handleLoadOk = handleLoadOk
exports.handleLoadCancel = handleLoadCancel
exports.toggleSaveContainer = toggleSaveContainer
exports.toggleLoadContainer = toggleLoadContainer
exports.handleReset = handleReset





//
