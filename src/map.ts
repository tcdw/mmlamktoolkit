export const regexMap = {
  signSamples: "(?<signSamples>#[s|S][a|A][m|M][p|P][l|L][e|E][s|S])",
  signInstruments: "(?<signInstruments>#[i|I][n|N][s|S][t|T][r|R][u|U][m|M][e|E][n|N][t|T][s|S])",
  signSpc: "(?<signSpc>#[s|S][p|P][c|C])",
  signInfo: "(?<signInfo>#(?:author|game|comment|title))",
  signLength: "(?<signLength>#length)",
  signPath: "(?<signPath>#[p|P][a|A][t|T][h|H])",
  signAmk: "(?<signAmk>#amk\\s+(?<signAmkValue>\\d*))",
  signAm4Amm: "(?<signAm4Amm>#am[4m])",
  signPad: "(?<signPad>#[p|P][a|A][d|D]\\s+(?<signPadValue>[a-fA-F\\d]*))",
  signHalvetempo: "(?<signHalvetempo>#[h|H][a|A][l|L][v|V][e|E][t|T][e|E][m|M][p|P][o|O])",
  signOption: "(?<signOption>#[o|O][p|P][t|T][i|I][o|O][n|N]\\s+(?<signOptionValue>\\S*))",
  signDefine: "(?<signDefine>#define\\s+(?<signDefineValue1>\\S*)(?<signDefineValueAdditional>\\s+(?<signDefineValue2>\\-?\\d*))?)",
  signUndef: "(?<signUndef>#undef\\s+(?<signUndefValue>\\S*))",
  signIfdef: "(?<signIfdef>#ifdef\\s+(?<signIfdefValue>\\S*))",
  signIfndef: "(?<signIfndef>#ifndef\\s+(?<signIfndefValue>\\S*))",
  signIf: "(?<signIf>#if\\s+(?<signIfValue1>\\S*)\\s+(?<signIfValue2>\\S*)\\s+(?<signIfValue3>\\-?\\d*))",
  signEndif: "(?<signEndif>#endif)",
  signError: "(?<signError>#error)",
  channel: "(?<channel>#(?<channelValue>\\d+))",
  sampleLoad: '(?<sampleLoad>\\("(?<sampleLoadValue1>\\S*)"\\,\\s*\\$(?<sampleLoadValue2>[a-fA-F\\d]*)\\))',
  illegalLoopBegin: "(?<illegalLoopBegin>(?:\\(\\d*\\))?\\[\\[\\[)",
  remoteCodeDefBegin: "(?<remoteCodeDefBegin>\\(\\!\\s*(?<remoteCodeDefBeginValue>\\d*)\\s*\\)\\[)",
  remoteCodeCall: "(?<remoteCodeCall>\\(\\!\\s*(?<remoteCodeCallValue1>\\d*)\\s*\\,\\s*(?<remoteCodeCallValue2>\\-?\\d*)\\s*(?:\\,\\s*(?<remoteCodeCallValue3>\\d*)\\s*)?\\))",
  superLoopBegin: "(?<superLoopBegin>\\[\\[)",
  labelLoopBegin: "(?<labelLoopBegin>\\((?<labelLoopBeginValue>\\d*)\\)\\[)",
  labelLoopCall: "(?<labelLoopCall>\\((?<labelLoopCallValue1>\\d*)\\)(?<labelLoopCallValue2>\\d*))",
  loopBegin: "(?<loopBegin>\\[)",
  illegalLoopEnd: "(?<illegalLoopEnd>\\]\\]\\]\\d*)",
  superLoopEnd: "(?<superLoopEnd>\\]\\](?<superLoopEndValue>\\d*))",
  loopEnd: "(?<loopEnd>\\](?<loopEndValue>\\d*))",
  loopRecall: "(?<loopRecall>\\*(?<loopRecallValue>\\d*))",
  curlyBracesBegin: "(?<curlyBracesBegin>\\{)",
  curlyBracesEnd: "(?<curlyBracesEnd>\\})",
  replacementBegin: '(?<replacementBegin>"\\s*(?<replacementBeginValue>[^"]*?)\\s*\\=)',
  quotation: '(?<quotation>")',
  hexCommand: "(?<hexCommand>\\$(?<hexCommandValue>[a-fA-F\\d]{0,2}))",
  hexSubLoop: "(?<hexSubLoop>\\$[e|E]6\\s*\\$(?<hexSubLoopValue>[a-fA-F\\d]{0,2}))",
  quantization: "(?<quantization>[qQ](?<quantizationValue>[a-fA-F\\d]{0,2}))",
  noise: "(?<noise>[nN](?<noiseValue>[a-fA-F\\d]{0,2}))",
  note: "(?<note>(?<notePitch>[a-gA-G][\\+\\-]?)(?<noteLength>[\\=\\.\\d]*))",
  rest: "(?<rest>r(?<restLength>[\\=\\.\\d]*))",
  tie: "(?<tie>\\^(?<tieLength>[\\=\\.\\d]*))",
  tune: "(?<tune>[hH](?<tuneValue>\\-?\\d*))",
  octave: "(?<octave>[oO](?<octaveValue>\\d*))",
  defaultLength: "(?<defaultLength>[lL](?<defaultLengthLength>\\d*))",
  instrument: "(?<instrument>@(?<instrumentValue>\\d*))",
  volume: "(?<volume>[vV](?<volumeValue>\\d*))",
  globalVolume: "(?<globalVolume>[wW](?<globalVolumeValue>\\d*))",
  pan: "(?<pan>[yY](?<panValue1>\\d*)(?<panValueAdditional>\\,?(?<panValue2>\\d*)\\,?(?<panValue3>\\d*))?)",
  tempo: "(?<tempo>[tT](?<tempoValue>\\d*))",
  vibrato: "(?<vibrato>[pP](?<vibratoValue1>\\d*)\\,?(?<vibratoValue2>\\d*)(?<vibratoValueAdditional>\\,?(?<vibratoValue3>\\d*))?)",
  octaveLower: "(?<octaveLower>\\<)",
  octaveRaise: "(?<octaveRaise>\\>)",
  pitchSlide: "(?<pitchSlide>&)",
  noLoop: "(?<noLoop>\\?)",
  loopPoint: "(?<loopPoint>\\/)",
  signAny: '(?<signAny>#(?<signAnyValue>[^"\\s]*))',
  anything: "(?<anything>\\S)",
};

export const hoverMap = {
  signSampleGroup: "Name of the sample group.\n\n(typically #default or #optimized)",
  signInstrumentsHexAA: "First ADSR value.\n\n(to use ADSR, make sure that it is >= $80. Otherwise GAIN is used.)",
  signInstrumentsHexBB: "Second ADSR value.",
  signInstrumentsHexCC: "GAIN value.",
  signInstrumentsHexDD: "Tuning multiplier.",
  signInstrumentsHexEE: "Tuning multiplier.\n\n(decimal/fractional portion.)",
  signAuthor: "Defines author's name.",
  signGame: "Defines game's name.",
  signComment: "Defines comment.",
  signTitle: "Defines song's name.",
  signLength: 'Defines how long this song\'s will play for.\n\n(Format must be m:ss or "auto".)',
  replacement: '**Replacement**\n\nReplaces what is on the right side of the equals sign with what is on the left side. The result can be used almost anywhere.\n\n*Example :*\n```\n"cymbal=@38"\n"drumloop=6"\n```',
  signSamples: '**#samples**\n\nDefine which samples this song uses.\n\n*Syntax is the following:*\n```\n#samples\n{\n  #samplegroup\n  "sample1.brr"\n  "sample2.brr"\n  "sample3.brr"\n}\n```',
  signInstruments: '**#instruments**\n\nDefine any custom instruments to use.\n\n*Syntax is the following:*\n```\n#instruments\n{\n  "sample1.brr" $aa $bb $cc $dd $ee\n  "sample2.brr" $aa $bb $cc $dd $ee\n  @0 $aa $bb $cc $dd $ee\n  n1F $aa $bb $cc $dd $ee\n}\n```',
  signSpc: '**#spc**\n\nDefine the tags that will be inserted into each song\'s automatically generated SPC.\n\n*Syntax is the following:*\n```\n#spc\n{\n  #author "Author\'s name"\n  #game	"Game\'s name"\n  #comment "A comment"\n  #title "Song\'s name"\n}\n```',
  signPath: "**#path**\n\nSpecify the default path in which to look for custom samples for this song.",
  signAmk: '**#amk**\n\nSpecifies which AddmusicK "song parser" this song was designed for.',
  signPad: "**#pad**\n\nSpecifies a minimumm size for this song.",
  signHalvetempo: '**#halvetempo**\n\nThis will halve a song\'s tempo, notes, and all hex commands that use a "duration" field.',
  signOption: "**#option**\n\nHandles various miscellaneous song options. You must put these at the top of your song file before any channel data.",
  signOptionTempoimmunity: '\n\n*tempoimmunity*\n\nThis command will disable the "tempo hike" effect caused by the timer going below 100 seconds.',
  signOptionDividetempo: "\n\n*dividetempo*\n\nSame as #halvetempo, but allows you to specify a value that's not a power of 2.",
  signOptionSmwvtable: "\n\n*smwvtable*\n\nForces the song to use SMW's velocity table instead of the default N-SPC one.",
  signOptionNoloop: "\n\n*noloop*\n\nLets AddmusicK know that this song should only play once and not loop one it is finished.",
  signOptionAmk109hotpatch: `\n\n*amk109hotpatch*

Activates a series of optional hot patches that were created for AddmusicK 1.0.9 to repair some playback quirks, but were not activated by default to avoid breaking older ports. The complete list of patches applied are as following:

- Glissando only runs for one note instead of two (as it previously mistakenly did).
- Echo writes are not enabled if the echo delay is set to zero and echo is otherwise not used. For extremely large songs, this prevents $FF00-$FF03 from being overwritten, giving you an extra 256 bytes to work with.
- $F3 command previously failed to zero out the fractional pitch base due to the code not being added on when ported from AddmusicM (which did not have this kind of feature) to AddmusicK.
- $FA $02 (Semitone tune) is not ignored by the $DD command for its target note.
- Readahead looks inside loops and superloops.
- When setting up an instrument (and for other commands that recycle the instrument setup code via using the updated backup table, such as $FA $01 (GAIN)), GAIN is written to first, then the ADSR voice DSP registers.
- Arpeggio notes will not play during rests.`,
  signDefine: "**#define**\n\nDefines a constant as existing, and optionally gives it a value.",
  signUndef: "**#undef**\n\nDefines a constant as not existing.",
  signIfdef: "**#ifdef**\n\nAnything from this point to the next #endif will only be compiled if the specified value has been defined by #define.",
  signIfndef: "**#ifndef**\n\nAnything from this point to the next #endif will only be compiled if the specified value has not been defined by #define.",
  signIf: "**#if**\n\nTests the relationship between the specified constant and an integer. Valid relations are ==, <, >, <=, >=, and !=. If the relationship holds true, then everything from this point to the next #endif is compiled.",
  signEndif: "**#endif**\n\nCompliment to the other tests. Ends their range of effect.",
  signError: "**#error**\n\nThrows an error and stops compilation. Obviously, you'll want to use this with #ifs, #ifdefs, etc.",
  channel: "**Channel** #\n\nWhich channel all the following commands will be written to. Valid values are 0 to 7.\n\n*Example :*\n```\n#0\n```",
  sampleLoad: '**Sample load** ("", $)\n\nLoads the sample specified in quotes, with a tuning value specified in hex after the $. The tuning value multiplies the pitch by this value (so 1 does not alter the pitch, 2 doubles it, etc).\n\n*Example :*\n```\n("Sample.brr", $04)\n```',
  remoteCodeDef: '**Remote code definition** (!)[]\n\nDefines a set of hex commands or other non-note non-loop commands that you can set to be called automatically at certain "events", such as whenever a note starts or some number of ticks before a note ends.\n\n*Example :*\n```\n(!6)[$FA $01 $55]\n(!7)[$FA $01 $00 v250]\n```',
  remoteCodeCall: '**Remote code call** (!)\n\nThis command will set up an event with the data contained in the remote code you specify. You must also specify the "trigger" for this code, or the event type.',
  remoteCodeCallExample: "\n\n*Example :*\n```\n(!6, 1, 4)\n(!7, -1)\n```",
  remoteCodeCallTypem1: "\n\n*-1*\n\nRun code whenever a note is keyed on. This will allow you to undo the changes done by other events. It can be run alongside other event types.",
  remoteCodeCallType0: '\n\n*0*\n\nDisable the remote commands for this channel, including the "key on" event type if it\'s also running. Note that whatever code is used for this event is not run, so any code can be used.',
  remoteCodeCallType1: "\n\n*1*\n\nRun code some amount of time after a note begins. Ties and rests won't trigger this event. This requires a third argument: the amount of time to wait. If the time to wait is longer than the current note, the code will never be triggered.",
  remoteCodeCallType2: "\n\n*2*\n\nRun code until some amount of time before a note ends. Relative to the qXX command. This requires a third argument: the amount of time to wait. If the time to wait is longer than the current note, the code will never be triggered.",
  remoteCodeCallType3: "\n\n*3*\n\nRun code whenever a note is keyed off. This is also relative to the qXX command. Unlike 2, this cancels the note cut event, so the note keeps playing. The note is absolutely keyed off, however, before the next note begins (this does not trigger this event).",
  remoteCodeCallType4: "\n\n*4*\n\nRun once, right now. This is also compatible with all other events, and because it can be used within loops, it effectively allows you to have a third layer of nested loops (see [[ ]] for the second layer).",
  remoteCodeCallType5: "\n\n*5*\n\nReserved. Do not use this event type.",
  superLoop: "**Superloop** [[ ]]\n\nA special loop variation. Normal loops may go inside of this and this may be placed in normal loops. You may not assign a value to this kind of a loop with parantheses, nor may you call it with the * command.\n\n*Example :*\n```\n[[c8 d8]]32\n```",
  labelLoop: "**Label loop** ()[]\n\nExactly the same as the normal loop command, but assigns a value to it as specified by the parentheses. See the next command for more information. Loops may not be nested.\n\n*Example :*\n```\n(6)[c8 d8]16\n```",
  labelLoopCall: "**Label loop call** ()\n\nCalls the specified loop. Define a loop with the previous command, and then call that loop with this command. Loops may not be nested.\n\n*Example :*\n```\n(6)32\n```",
  loop: "**Loop** []\n\nRepeats whatever is contained within the brackets by the value spcified. Extremely useful for saving space. Loops may not be nested.\n\n*Example :*\n```\n[c8 d8]16\n```",
  loopRecall: "**Loop recall** *\n\nCalls the most recently used loop.\n\n*Example :*\n```\n*8\n```",
  curlyBraces: "**Triplet** {}\n\nAny notes surrounded by curly braces will be treated as triplets (i.e. their durations will be multiplied by 2/3).\n\n*Example :*\n```\n{c4 d4 c4}\n```",
  hexCommandDA: "**Instrument** $DA $XX\n\nSets the instrument for the current channel.\n\n*$XX* : Instrument to set to. Default limit is $00 to $12.",
  hexCommandDB: "**Pan** $DB $XX\n\nSets the panning for the current channel.\n\n*$XX* : Panning value. Must be between $00 and $13.",
  hexCommandDC: "**Pan fade** $DC $XX $YY\n\nFades the pan over time\n\n*$XX* : Duration\n\n*$YY* : Final panning value",
  hexCommandDD: "**Pitch bend** $DD $XX $YY $ZZ\n\nSlides from the currently playing note to the specified note smoothly.\n\n*$XX* : Delay\n\n*$YY* : Duration\n\n*$ZZ* : Note",
  hexCommandDE: "**Vibrato** $DE $XX $YY $ZZ\n\nTurns on vibrato for the current channel\n\n*$XX* : Delay\n\n*$YY* : Duration\n\n*$ZZ* : Amplitude",
  hexCommandDF: "**Vibrato off** $DF\n\nTurns off vibrato.",
  hexCommandE0: "**Global volume** $E0 $XX\n\nSets the song's global volume\n\n*$XX* : Volume",
  hexCommandE1: "**Global volume fade** $E1 $XX $YY\n\nFades the song's global volume\n\n*$XX* : Duration\n\n*$YY* : Volume",
  hexCommandE2: "**Tempo** $E2 $XX\n\nSets the tempo to the specified value\n\n*$XX* : Tempo",
  hexCommandE3: "**Tempo fade** $E3 $XX $YY\n\nFades the tempo to the specified value\n\n*$XX* : Duration\n\n*$YY* : Value",
  hexCommandE4: "**Global transpose** $E4 $XX\n\nTransposes all instruments by the value\n\n*$XX* : Transposition",
  hexCommandE5: "**Tremolo** $E5 $XX $YY $ZZ\n\nEnables tremolo for the current channel\n\n*$XX* : Delay\n\n*$YY* : Duration\n\n*$ZZ* : Amplitude",
  hexCommandE6: "**Subloop** $E6 $XX\n\n*$XX* : Subloop start(00) or Loop count",
  hexCommandE600: "**Subloop start** $E6 $00\n\nSets the starting point for a subloop",
  hexCommandE6XX: "**Subloop end** $E6 $XX\n\nSets the ending point for a subloop\n\n*$XX* : Loop count",
  hexCommandE7: "**Volume** $E7 $XX\n\nSets the volume for the current channel\n\n*$XX* : Volume",
  hexCommandE8: "**Volume fade** $E8 $XX $YY\n\nFades the volume for the current channel\n\n*$XX* : Duration\n\n*$YY* : Volume",
  hexCommandE9: "**Loop** $E9 $XX $YY $ZZ\n\nNormal loop. Do not use manually.",
  hexCommandEA: "**Vibrato fade** $EA $XX\n\nFades to the amplitude specified by $DE over the specified period of time.\n\n*$XX* : Duration",
  hexCommandEB: "**Pitch envelope (release)** $EB $XX $YY $ZZ\n\nBends all subsequent notes from the current note to the current note + the specified number of semitones.\n\n*$XX* : Delay\n\n*$YY* : Duration\n\n*$ZZ* : Semitone difference",
  hexCommandEC: "**Pitch envelope (attack)** $EC $XX $YY $ZZ\n\nBends all subsequent notes from the current note + the specified number of semitones to the current note.\n\n*$XX* : Delay\n\n*$YY* : Duration\n\n*$ZZ* : Semitone difference",
  hexCommandED: "**ADSR or GAIN** $ED $XX $YY\n\n*$XX* : Set to 80 to set GAIN\n\n*$YY*",
  hexCommandEDXX: "**ADSR** $ED $DA $SR\n\nEnables a custom ADSR on the current channel. $DA must not be be > $7F.\n\n*$DA* : Delay (3 bits), attack (7 bits); 0dddaaaa\n\n*$SR* : Sustain (3 bits), Release (5 bits); sssrrrrr",
  hexCommandED80: "**GAIN** $ED $00 $YY\n\nEnables a custom GAIN on the current channel.\n\n*$80*\n\n*$YY* : GAIN",
  hexCommandEE: "**Tune channel** $EE $XX\n\nSets the pitch modifier for this channel.\n\n*$XX* : Tuning",
  hexCommandEF: "**Echo 1** $EF $XX $YY $ZZ\n\nSets some of the echo parameters for this song.\n\n*$XX* : Which channels have echo, bitwise (76543210)\n\n*$YY* : Echo volume, left\n\n*$ZZ* : Echo volume, right",
  hexCommandF0: "**Echo off** $F0\n\nTurns off echo",
  hexCommandF1: '**Echo 2** $F1 $XX $YY $ZZ\n\nSets some of the echo parameters for this song.\n\n*$XX* : Echo delay. May only be 00 - 0F\n\n*$YY* : feedback/reverberation\n\n*$ZZ* : FIR filter to use. $01 is "on" and $00 is "off".',
  hexCommandF2: "**Echo fade** $F2 $XX $YY $ZZ\n\nFades the echo volume\n\n*$XX* : Duration\n\n*$YY* : Final echo volume for left speaker\n\n*$ZZ* : Final echo volume for right speaker",
  hexCommandF3: '**Sample load** $F3 $XX $YY\n\nStarts playing the specified sample. Note that the ("", $) command is highly preferred over this.\n\n*$XX* : Sample to use\n\n*$YY* : Multiplication pitch',
  hexCommandF4: "**Misc commands 1** $F4 $XX\n\n*$XX* : Command Value.",
  hexCommandF400: "**Yoshi drums** $F4 $00\n\nEnables yoshi drums on channel #5",
  hexCommandF401: "**Legato** $F4 $01\n\nToggle legato (notes will be played with no break between. This also means that samples will not be rekeyed, so new notes will not start the sample playing from the beginning).",
  hexCommandF402: '**Light staccato** $F4 $02\n\nToggle light staccato (notes will be played with less of a delay between). Please be aware that this command is "global".',
  hexCommandF403: "**Echo toggle** $F4 $03\n\nToggles the echo for this channel",
  hexCommandF405: "**SNES sync** $F4 $05\n\nSends the current song's position to the output registers.",
  hexCommandF406: "**Yoshi drums** $F4 $06\n\nEnables yoshi drums on the current channel",
  hexCommandF407: '**Tempo hike off** $F4 $07\n\nDisables the tempo hike caused by the "time is running out!" sound effect.',
  hexCommandF408: "**Velocity table** $F4 $08\n\nSwitch the velocity table to use.",
  hexCommandF409: "**Restore instrument** $F4 $09\n\nRestores all the instrument settings for the current channel.",
  hexCommandF5: "**FIR filter** $F5 $X0 $X1 $X2 $X3 $X4 $X5 $X6 $X7\n\nSets the fir filter coefficients.\n\n*$X0* : Coefficient 1\n\n*$X1* : Coefficient 2\n\n*$X2* : Coefficient 3\n\n*$X3* : Coefficient 4\n\n*$X4* : Coefficient 5\n\n*$X5* : Coefficient 6\n\n*$X6* : Coefficient 7\n\n*$X7* : Coefficient 8",
  hexCommandF6: "**DSP write** $F6 $XX $YY\n\nWrite a value directly to the DSP\n\n*$XX* : Register to write to\n\n*$YY* : Value to write",
  hexCommandF8: '**Enable noise** $F8 $XX\n\nEnables noise for the current channel. Using an instrument that does not use noise will disable it.\n\n*$XX* : "Pitch" of the noise.',
  hexCommandF9: "**Data send** $F9 $XX $YY\n\nSends two bytes of data to the SNES. See asm/SNES/patch.asm for more info.\n\n*$XX* : The first byte to send.\n\n*$YY* : The second byte to send.",
  hexCommandFA: "**Misc commands 2** $FA $XX $YY\n\n*$XX* : Command Value.\n\n*$YY*",
  hexCommandFA00: "**Pitch modulation** $FA $00 $XX\n\nEnables pitch modulation\n\n*$00*\n\n*$XX* : Which channels to enable pitch modulation on, bitwise (7654321-)",
  hexCommandFA01: "**GAIN** $FA $01 $XX\n\nEnables GAIN on the current channel\n\n*$01*\n\n*$XX* : The GAIN value to use",
  hexCommandFA02: "**Semitone tune** $FA $02 $XX\n\nTunes the current channel by the specified number of semitones\n\n*$02*\n\n*$XX* : Number of semitones to tune by",
  hexCommandFA03: "**Amplify** $FA $03 $XX\n\nMultiplies the volume of the current channel by this value + 1. 0 will not modify the volume, whereas FF will (just shy of) double it.\n\n*$03*\n\n*$XX* : Value to multiply the volume by",
  hexCommandFA04:
    "**Echo buffer reserve** $FA $04 $XX\n\nYou do not need to use this command manually. In fact, you probably shouldn't. This is inserted at the beginning of every song by the program, and doesn't have much use otherwise. Its sole purpose is to reserve an echo buffer large enough for the song's longest echo delay\n\n*$04*\n\n*$XX* : The largest echo buffer you plan to use",
  hexCommandFA7F: `**Hot patch reset** $FA $7F $XX\n\nApplies a preset that replicates the music playback of a different Addmusic. Note that these settings are "global"; i.e. it applies to all channels. Preset IDs are as following (not all of them have been properly implemented yet, and are subject to change as new ones are added on)...

  - $00 - AddmusicK 1.0.8 and earlier (not counting Beta)
  - $01 - AddmusicK 1.0.9
  - $02 - AddmusicK Beta
  - $03 - Romi's Addmusic404
  - $04 - Addmusic405
  - $05 - AddmusicM
  - $06 - carol's MORE.bin
  - $07 - Vanilla SMW
  - $08-$7F - Reserved. Do not use.
  - $80-$FF - User-defined Preset ID. Note that the preceding presets all use a pre-defined set of bits to use: you don't need to follow the same procedure and can do something else instead.`,
  hexCommandFAFE: `**Hot patch toggle bits** $FA $FE $XX\n\nContains a series of individual patches that can be toggled on and off on a per-bit basis. Note that these settings are "global"; i.e. it applies to all channels. The number of bytes this command takes up is variable: setting the highest bit (%1???????) means you define a second byte that contains an additional seven bits to set on and off (they will otherwise default to off). These bits are pre-defined...  
  Byte 0: %xyzabcde...  
  
  * %x - Define a new byte. Each byte that has this bit set will cause another byte to be defined. By default, all undefined bytes have their bits cleared.
  * %y - When set, glissando runs for only one note. Otherwise, it runs for two notes.
  * %z - When set, during buffer initialization done through the $FA $04 command, echo writes are not initially enabled if a zero echo delay is used (the $F1 command will enable them). Otherwise, echo writes are enabled even if a zero echo delay is used: as a side effect, $FF00-$FF03 will be overwritten in ARAM, meaning extremely large songs may lose some data (most likely sample data) when crossing this region. **This must be used at the start of the song on the lowest number channel prior to both any intro markers and notes in order to properly work, otherwise this won't stop $FF00-$FF03 from being overwritten if you are not using echo.**
  * %a - When set, the $F3 command will zero out the fractional pitch base. Otherwise, this operation is not performed.
  * %b - When set, $FA $02 (Semitone tune) is not ignored by the $DD command for its target note. Otherwise, $FA $02 (Semitone tune) is ignored by the $DD command's target note.
  * %c - When set, readahead looks inside loops and superloops. Otherwise, readahead does not look inside loops and superloops.
  * %d - When set, the GAIN register is written to first, then the ADSR registers when initializing an instrument. Otherwise, the ADSR registers are written to first, then GAIN.
  * %e - When set, arpeggio notes will not play during rests. Otherwise, they will run normally even if a rest is used.
  
  Byte 1: %xyzabcde...  
  
  * %x - Define a new byte. Each byte that has this bit set will cause another byte to be defined. By default, all undefined bytes have their bits cleared.
  * %y - Currently undefined. Please do not set under normal circumstances (unless you're doing your own hot patches: even then, this bit is subject to being used in future Addmusic versions).
  * %z - Currently undefined. Please do not set under normal circumstances (unless you're doing your own hot patches: even then, this bit is subject to being used in future Addmusic versions).
  * %a - Currently undefined. Please do not set under normal circumstances (unless you're doing your own hot patches: even then, this bit is subject to being used in future Addmusic versions).
  * %b - Currently undefined. Please do not set under normal circumstances (unless you're doing your own hot patches: even then, this bit is subject to being used in future Addmusic versions).
  * %c - Currently undefined. Please do not set under normal circumstances (unless you're doing your own hot patches: even then, this bit is subject to being used in future Addmusic versions).
  * %d - Currently undefined. Please do not set under normal circumstances (unless you're doing your own hot patches: even then, this bit is subject to being used in future Addmusic versions).
  * %e - When set, rests are only keyed off if they are detected in readahead. Otherwise, they are keyed off immediately when encountered.
  
  All other bytes are currently undefined. They are subject to being used in future Addmusic versions.`,
  hexCommandFB: "**Arpeggio commands** $FB $XX $YY $...\n\n*$XX* : Arpeggio type.\n\n*$YY*\n\n*$...*",
  hexCommandFBXX:
    "**Arpeggio** $FB $XX $YY $...\n\nSpecifies an arpeggio. Each note after this will play with a specified pattern.\n\n*$XX* : Number of notes in the sequence (must be less than $80). If this is 0, then arpeggio is turned off.\n\n*$YY* : The duration of each note\n\n*$...* : The sequence of notes. Each byte is the change in pitch from the currently playing note.",
  hexCommandFB80: "**Trill** $FB $80 $YY $ZZ\n\nA specialized version of the arpeggio command. It implies that you want to alternate between only two notes.\n\n*$80*\n\n*$YY* : The duration of each note\n\n*$ZZ* : The change of pitch between the currently playing note and the trilled note.",
  hexCommandFB81:
    "**Glissando** $FB $81 $YY $ZZ\n\nIf glissando is turned on, then the current note will be rekeyed at increasingly higher/lower pitches. Analogous to sliding your hand down a keyboard.\n\n*$81*\n\n*$YY* : If glissando is turned on, then the current note will be rekeyed at increasingly higher/lower pitches. Analogous to sliding your hand down a keyboard.\n\n*$ZZ* : The number of semitones to step up or down by for each new note",
  hexCommandFC: "**Remote commands** $FC $WW $XX $YY $ZZ\n\n*$WW* : Address to jump to, low byte (not used for event type 0)\n\n*$XX* : Address to jump to, high byte (not used for event type 0)\n\n*$YY* : The event type\n\n*$ZZ* : How long to wait when using wait types 1 or 2. Note that a value of $00 is treated as $0100",
  hexCommandFD: "**Tremolo Off** $FD\n\nDisables tremolo for the current channel",
  hexCommandFE: "**Pitch Envelope Off** $FE\n\nTurns off pitch envelope.",
  quantization: "**Quantization** q\n\nThis command is specified in hex. The first digit specifies how long of a delay there is between each note. Valid values are from 0 to 7, with 7 having the smallest delay. The second digit controls the volume. Valid values are from 0 to F, with F being the loudest.\n\n*Example :*\n```\nq7F q70\n```",
  noise: "**Noise** n\n\nStarts playing noise on the current channel instead of using the current instrument's sample. ADSR and such are preserved, and the effect can be cancelled by using an instrument. The value must be a hex value between 0 and 1F.\n\n*Example :*\n```\nn5 n1F\n```",
  note: "**Note** c,d,e,f,g,a,b\n\nUse + or - after the letter to specify a sharp or flat, respectively. A number should appear after the note; this number should denote the note's duration. 1 is a whole note, 2 is a half note, 4 a quarter note, 8 an eighth note, etc. There are ways to specify notes of other durations; see below.\n\n*Example :*\n```\nc16 g+8 a-1\n```",
  rest: "**Rest** r\n\nSimilar to a normal note, the number after it defines its length.\n\n*Example :*\n```\nr16 r8 r1\n```",
  tie: "**Tie** ^\n\nAttach this to a note or rest to extend its length. The number after it defines its length.\n\n*Example :*\n```\nc4^8 r1^2\n```",
  tune: "**Tune** h\n\nChanges the value of all subsequent notes by the value specified. All integers, even negative ones, are valid. Note that this only affects how AddmusicK interprets the notes.\n\n*Example :*\n```\nh4 h-3\n```",
  octave: "**Octave** o\n\nSpecifies what octave the following notes should be read as. Valid values are 1 to 6. Note that this command only affects how AddmusicK interprets the notes.\n\n*Example :*\n```\no3 c16 o2 c16\n```",
  defaultLength: "**Default length** l\n\nSpecifies the length of notes, rests, or ties whose lengths are not specified.\n\n*Example :*\n```\nl8\n```",
  instrument: '**Instrument** @\n\nSpecify the instrument to play. Valid values are 0 - 18, 21-29, and 30+. 30 and above are "custom" instruments, which are described below.\n\n*Example :*\n```\n@28\n```',
  volume: "**Volume** v\n\nSets the volume for the currently playing channel. Valid values are 0 to 255.\n\n*Example :*\n```\nv240\n```",
  globalVolume: "**Global volume** w\n\nSets the volume for the entire song. Valid values are 0 to 255.\n\n*Example :*\n```\nw200\n```",
  pan: "**Pan** y\n\nSet the pan for the current channel. Valid values are from 0 to 20; is all the way to the right, and 20 is all the way to the left. 10 is centered. If two extra arguments are specified, then a 1 will indicate that that speaker (left,right) should have surround sound enabled.\n\n*Example :*\n```\n10 y10,0,1\n```",
  tempo: "**Tempo** t\n\nHow quickly the song should play. To convert from BPM to this, multiply the BPM by 0.4. Please be aware that the higher the tempo is, the more likely your song is to experience slowdown.\n\n*Example :*\n```\nt40\n```",
  vibrato:
    "**Vibrato** p\n\nPulsate the pitch over a period of time. There may be either two or three arguments to this command, separated by commas. If there are two arguments, then the first is the rate (speed) and the second is the extent (amplitude). If there are three values, then the first is the duration of the delay before the vibrato starts, the second is the rate, and the third is the extent.\n\n*Example :*\n```\np24,12,8 p12,8\n```",
  octaveLower: "**Lower octave** <\n\nLowers the current octave by one.\n\n*Example :*\n```\no3 c16 > c16\n```",
  octaveRaise: "**Raise octave** >\n\nRasies the current octave by one.\n\n*Example :*\n```\no3 c16 < c16\n```",
  pitchSlide: "**Pitch slide** &\n\nSlides the pitch between the note that came before this command and the note that comes after it. While this is the easiest way to do this, the $DD hex command offers more flexibility.\n\n*Example :*\n```\nc4&d4\n```",
  noLoop: "**Misc.** ?\n\nCauses this song to not loop (useful for, for example, victory themes).",
  loopPoint: '**Intro** /\n\nThis will mark the intro to this song. An intro only plays once; when a song "ends" it will jump back to the position specified by this intro marker (if this command is not specified, then it simply jumps back to the song\'s start).',
};

export type CurlyBracesType = "SAMPLES" | "INSTRUMENTS" | "SPC" | "NONE" | "SIGNIF";
