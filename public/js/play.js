const beatMod = require('./beat')
const synthMod = require('./synthesis')
const drawMod = require('./draw')
const kitMod = require('./kit')
const impulseMod = require('./impulse')

const drums = require('./drummachine')


function advanceNote() {

    synthMod.updatePatternFromCode();

    // Advance time by a 16th note...
    var secondsPerBeat = 60.0 / beatMod.theBeat.tempo;

    beatMod.setRhythmIndex(beatMod.rhythmIndex + 1);
    if (beatMod.rhythmIndex == beatMod.loopLength) {
        beatMod.setRhythmIndex(0);
    }

        // apply swing
    if (beatMod.rhythmIndex % 2) {
        noteTime += (0.25 + beatMod.kMaxSwing * beatMod.theBeat.swingFactor) * secondsPerBeat;
    } else {
        noteTime += (0.25 - beatMod.kMaxSwing * beatMod.theBeat.swingFactor) * secondsPerBeat;
    }
}

function playNote(buffer, pan, x, y, z, sendGain, mainGain, playbackRate, noteTime) {
    // Create the note
    var voice = drums.context.createBufferSource();
    voice.buffer = buffer;
    voice.playbackRate.value = playbackRate;

    // Optionally, connect to a panner
    var finalNode;
    if (pan) {
        var panner = drums.context.createPanner();
        panner.panningModel = "HRTF";
        panner.setPosition(x, y, z);
        voice.connect(panner);
        finalNode = panner;
    } else {
        finalNode = voice;
    }

    // Connect to dry mix
    var dryGainNode = drums.context.createGain();
    dryGainNode.gain.value = mainGain * impulseMod.effectDryMix;
    finalNode.connect(dryGainNode);
    dryGainNode.connect(drums.masterGainNode);

    // Connect to wet mix
    var wetGainNode = drums.context.createGain();
    wetGainNode.gain.value = sendGain;
    finalNode.connect(wetGainNode);
    wetGainNode.connect(drums.convolver);

    voice.start(noteTime);
}

function schedule() {
    var currentTime = drums.context.currentTime;

    // The sequence starts at startTime, so normalize currentTime so that it's 0 at the start of the sequence.
    currentTime -= beatMod.startTime;

    while (noteTime < currentTime + 0.120) {
        // Convert noteTime to context time.
        var contextPlayTime = noteTime + beatMod.startTime;

        // Kick
        if (beatMod.theBeat.rhythm1[beatMod.rhythmIndex] && instrumentActive[0]) {
            playNote(kitMod.currentKit.kickBuffer, false, 0,0,-2, 0.5, kitMod.volumes[beatMod.theBeat.rhythm1[beatMod.rhythmIndex]] * 1.0, kickPitch, contextPlayTime);
        }

        // Snare
        if (beatMod.theBeat.rhythm2[beatMod.rhythmIndex] && instrumentActive[1]) {
            playNote(kitMod.currentKit.snareBuffer, false, 0,0,-2, 1, kitMod.volumes[beatMod.theBeat.rhythm2[beatMod.rhythmIndex]] * 0.6, snarePitch, contextPlayTime);
        }

        // Hihat
        if (beatMod.theBeat.rhythm3[beatMod.rhythmIndex] && instrumentActive[2]) {
            // Pan the hihat according to sequence position.
            playNote(kitMod.currentKit.hihatBuffer, true, 0.5*beatMod.rhythmIndex - 4, 0, -1.0, 1, kitMod.volumes[beatMod.theBeat.rhythm3[beatMod.rhythmIndex]] * 0.7, hihatPitch, contextPlayTime);
        }

        // Toms
        if (beatMod.theBeat.rhythm4[beatMod.rhythmIndex] && instrumentActive[3]) {
            playNote(kitMod.currentKit.tom1, false, 0,0,-2, 1, kitMod.volumes[beatMod.theBeat.rhythm4[beatMod.rhythmIndex]] * 0.6, tom1Pitch, contextPlayTime);
        }

        if (beatMod.theBeat.rhythm5[beatMod.rhythmIndex] && instrumentActive[4]) {
            playNote(kitMod.currentKit.tom2, false, 0,0,-2, 1, kitMod.volumes[beatMod.theBeat.rhythm5[beatMod.rhythmIndex]] * 0.6, tom2Pitch, contextPlayTime);
        }

        if (beatMod.theBeat.rhythm6[beatMod.rhythmIndex] && instrumentActive[5]) {
            playNote(kitMod.currentKit.tom3, false, 0,0,-2, 1, kitMod.volumes[beatMod.theBeat.rhythm6[beatMod.rhythmIndex]] * 0.6, tom3Pitch, contextPlayTime);
        }


        // Attempt to synchronize drawing time with sound
        if (noteTime != drawMod.lastDrawTime) {
            drawMod.setLastDrawTime(noteTime);
            drawMod.drawPlayhead((beatMod.rhythmIndex + 15) % 16);
        }

        advanceNote();
    }
}

function playDrum(noteNumber, velocity) {
    switch (noteNumber) {
        case 0x24:
            playNote(kitMod.currentKit.kickBuffer,  false, 0,0,-2,  0.5, (velocity / 127), kickPitch,  0);
            break;
        case 0x26:
            playNote(kitMod.currentKit.snareBuffer, false, 0,0,-2,  1,   (velocity / 127), snarePitch, 0);
            break;
        case 0x28:
            playNote(kitMod.currentKit.hihatBuffer, true,  0,0,-1.0,1,   (velocity / 127), hihatPitch, 0);
            break;
        case 0x2d:
            playNote(kitMod.currentKit.tom1,        false, 0,0,-2,  1,   (velocity / 127), tom1Pitch,  0);
            break;
        case 0x2f:
            playNote(kitMod.currentKit.tom2,        false, 0,0,-2,  1,   (velocity / 127), tom2Pitch,  0);
            break;
        case 0x32:
            playNote(kitMod.currentKit.tom3,        false, 0,0,-2,  1,   (velocity / 127), tom3Pitch,  0);
            break;
        default:
            console.log("note:0x" + noteNumber.toString(16) );
    }
}





// functions
exports.advanceNote = advanceNote;
exports.playNote = playNote;
exports.schedule = schedule;
exports.playDrum = playDrum;



//