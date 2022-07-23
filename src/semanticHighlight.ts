import * as vscode from "vscode";
import { regexMap } from "./map";

const tokenTypes = new Map<string, number>();
const tokenModifiers = new Map<string, number>();

const legend = (function () {
  const tokenTypesLegend = ["variable", "note", "rest", "octave", "hex"];
  tokenTypesLegend.forEach((tokenType, index) => tokenTypes.set(tokenType, index));

  const tokenModifiersLegend = ["readonly", "o1", "o2", "o3", "o4", "o5", "o6"];
  tokenModifiersLegend.forEach((tokenModifier, index) => tokenModifiers.set(tokenModifier, index));

  return new vscode.SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
})();

class MmlSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
  async provideDocumentSemanticTokens(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.SemanticTokens> {
    return new Promise((resolve, reject) => {
      const builder = new vscode.SemanticTokensBuilder();

      const regexArray: string[] = [
        regexMap.replacementBegin,
        regexMap.quotation,
        regexMap.signSamples,
        regexMap.signInstruments,
        regexMap.signSpc,
        regexMap.signOption,
        regexMap.signDefine,
        regexMap.signUndef,
        regexMap.signIfdef,
        regexMap.signIfndef,
        regexMap.signIf,
        regexMap.signAny,
        regexMap.curlyBracesEnd,
        regexMap.channel,
        regexMap.hexCommand,
        regexMap.quantization,
        regexMap.noise,
        regexMap.note,
        regexMap.rest,
        regexMap.tie,
        regexMap.octave,
        regexMap.octaveLower,
        regexMap.octaveRaise,
        "(?<num>\\d+)",
      ];
      let replacementMap: Map<string, { octave: number; isAbsolute: boolean; endWithEmptyOctave?: boolean }> = new Map();

      let octave = 4;
      let replacementOctave: { octave: number; isAbsolute: boolean; endWithEmptyOctave?: boolean } | undefined = undefined;
      let replacementKey = "";
      let inQuotation = false;
      let inCurlyBraces = false;
      let previousMatch = undefined;

      //HexCommand
      let hexCount = 0;
      let hexMatch = undefined;
      let arpeggioCount = 0;

      for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
        let text = document.lineAt(lineIndex).text;

        //Exclude comment(;)
        if (text.includes(";")) {
          const index = text.indexOf(";");
          if (index === 0) {
            continue;
          }
          text = text.substring(0, index);
        }

        let match;
        let lastIndex = 0;
        while ((match = getRegexMap().exec(text)) !== null) {
          if (match.groups !== undefined) {
            lastIndex = match.index + match[0].length;
            let isHex = false;

            //replacementBegin("=)
            if (match.groups.replacementBegin !== undefined) {
              replacementKey = match.groups.replacementBeginValue;
              replacementOctave = { octave: 0, isAbsolute: false };
            }

            //quotation(")
            else if (match.groups.quotation !== undefined) {
              if (replacementOctave !== undefined) {
                if (replacementKey !== "") {
                  replacementMap.set(replacementKey, replacementOctave);
                }
                replacementOctave = undefined;
                replacementKey = "";
              } else if (!inQuotation) {
                inQuotation = true;
              } else {
                inQuotation = false;
              }
            }

            //inQuotation check
            else if (!inQuotation) {
              //sign+curlyBraces
              if (match.groups.signSamples !== undefined || match.groups.signInstruments !== undefined || match.groups.signSpc !== undefined) {
                if (!inCurlyBraces) {
                  inCurlyBraces = true;
                }
              }

              //curlyBracesEnd(})
              else if (match.groups.curlyBracesEnd !== undefined) {
                inCurlyBraces = false;
              }

              //inCurlyBraces check
              else if (!inCurlyBraces) {
                //replacementCall
                if (match.groups.replacementCall !== undefined) {
                  builder.push(lineIndex, match.index, match[0].length, 0, 1);

                  let replacement;
                  if ((replacement = replacementMap.get(match.groups.replacementCall)) !== undefined) {
                    if (replacement.isAbsolute) {
                      if (replacementOctave !== undefined) {
                        replacementOctave.octave = replacement.octave;
                        replacementOctave.isAbsolute = true;
                      } else {
                        octave = replacement.octave;
                      }
                    } else {
                      if (replacementOctave !== undefined) {
                        replacementOctave.octave += replacement.octave;
                      } else {
                        octave += replacement.octave;
                      }
                    }
                    if (replacementOctave !== undefined && replacement.endWithEmptyOctave && text[match.index + match[0].length] === '"') {
                      replacementOctave.endWithEmptyOctave = true;
                    }
                  }
                }

                //channel(#)
                else if (match.groups.channel !== undefined) {
                  if (replacementOctave !== undefined) {
                    replacementOctave.octave = 4;
                    replacementOctave.isAbsolute = true;
                  } else {
                    octave = 4;
                  }
                }

                //hexCommand($)
                else if (match.groups.hexCommand !== undefined) {
                  isHex = true;

                  if (hexMatch === undefined) {
                    builder.push(lineIndex, match.index, match[0].length, 4);
                    hexMatch = match;
                    hexCount = 0;
                  }

                  if (hexMatch.groups !== undefined) {
                    switch (hexMatch.groups.hexCommandValue.toUpperCase()) {
                      //No argument
                      //Vibrato off
                      case "DF":
                      //Echo off
                      case "F0":
                        hexMatch = undefined;
                        break;

                      //1 argument(FF)
                      //Instrument
                      case "DA":
                      //Pan
                      case "DB":
                      //Global volume
                      case "E0":
                      //Tempo
                      case "E2":
                      //Global transpose
                      case "E4":
                      //Subloop
                      case "E6":
                      //Volume
                      case "E7":
                      //Vibrato fade
                      case "EA":
                      //Tune channel
                      case "EE":
                      //Misc 1
                      case "F4":
                      //Enable noise
                      case "F8":
                        if (hexCount >= 1) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //2 arguments(FF)
                      //Pan fade
                      case "DC":
                      //Global volume fade
                      case "E1":
                      //Tempo fade
                      case "E3":
                      //Volume fade
                      case "E8":
                      //ADSR,GAIN
                      case "ED":
                      //Misc 2
                      case "FA":
                      //Sample load
                      case "F3":
                      //Data send
                      case "F9":
                      //DSP write
                      case "F6":
                        if (hexCount >= 2) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //3 arguments(FF)
                      //Pitch bend
                      case "DD":
                      //Vibrato
                      case "DE":
                      //Tremolo
                      case "E5":
                      //Loop
                      case "E9":
                      //Pitch envelope (release)
                      case "EB":
                      //Pitch envelope (attack)
                      case "EC":
                      //Echo 1
                      case "EF":
                      //Echo 2
                      case "F1":
                      //Echo fade
                      case "F2":
                        if (hexCount >= 3) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //FIR filter
                      case "F5":
                        if (hexCount >= 8) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Misc 3
                      case "FB":
                        if (hexCount === 1) {
                          arpeggioCount = parseInt("0x" + match.groups.hexCommandValue, 16);
                        } else if (hexCount >= 2) {
                          //arpeggioCount check
                          //Arpeggio off
                          if (arpeggioCount <= 0) {
                            hexMatch = undefined;
                          }
                          //Trill,Glissando
                          else if ((arpeggioCount === 128 || arpeggioCount === 129) && hexCount >= 3) {
                            hexMatch = undefined;
                          } else if (hexCount >= arpeggioCount + 2) {
                            hexMatch = undefined;
                          }
                        }
                        hexCount++;
                        break;

                      //Remote commands
                      case "FC":
                        if (hexCount >= 4) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;
                    }
                  }
                }

                //note(a-g)
                else if (match.groups.note !== undefined || match.groups.tie !== undefined) {
                  if (replacementOctave === undefined) {
                    builder.push(lineIndex, match.index, match[0].length, 1, 2 ** octave);
                  } else if (replacementOctave.isAbsolute) {
                    builder.push(lineIndex, match.index, match[0].length, 1, 2 ** replacementOctave.octave);
                  }
                }

                //rest(r)
                else if (match.groups.rest !== undefined) {
                  builder.push(lineIndex, match.index, match[0].length, 2);
                }

                //octave(o)
                else if (match.groups.octave !== undefined) {
                  if (match.groups.octaveValue !== "") {
                    if (parseInt(match.groups.octaveValue) < 1) {
                      builder.push(lineIndex, match.index, match[0].length, 3, 2 ** 1);
                      if (replacementOctave !== undefined) {
                        replacementOctave.octave = 1;
                        replacementOctave.isAbsolute = true;
                      } else {
                        octave = 1;
                      }
                    } else if (6 < parseInt(match.groups.octaveValue)) {
                      builder.push(lineIndex, match.index, match[0].length, 3, 2 ** 6);
                      if (replacementOctave !== undefined) {
                        replacementOctave.octave = 6;
                        replacementOctave.isAbsolute = true;
                      } else {
                        octave = 6;
                      }
                    } else {
                      builder.push(lineIndex, match.index, match[0].length, 3, 2 ** parseInt(match.groups.octaveValue));
                      if (replacementOctave !== undefined) {
                        replacementOctave.octave = parseInt(match.groups.octaveValue);
                        replacementOctave.isAbsolute = true;
                      } else {
                        octave = parseInt(match.groups.octaveValue);
                      }
                    }
                  } else if (match.groups.octaveValue === "" && replacementOctave !== undefined && text[match.index + 1] === '"') {
                    replacementOctave.endWithEmptyOctave = true;
                  }
                }

                //octaveLower(<)
                else if (match.groups.octaveLower !== undefined) {
                  if (replacementOctave !== undefined) {
                    if (!(replacementOctave.isAbsolute && replacementOctave.octave < 2)) {
                      replacementOctave.octave--;
                    }
                  } else {
                    if (1 < octave) {
                      octave--;
                    }
                  }
                }

                //octaveRaise(>)
                else if (match.groups.octaveRaise !== undefined) {
                  if (replacementOctave !== undefined) {
                    if (!(replacementOctave.isAbsolute && 5 < replacementOctave.octave)) {
                      replacementOctave.octave++;
                    }
                  } else {
                    if (octave < 6) {
                      octave++;
                    }
                  }
                }

                //
                else if (match.groups.num !== undefined && previousMatch?.groups?.replacementCall !== undefined && previousMatch.groups.replacementCall[previousMatch.groups.replacementCall.length - 1] === text[match.index - 1] && replacementMap.get(previousMatch.groups.replacementCall)?.endWithEmptyOctave) {
                  if (parseInt(match.groups.num) < 1) {
                    builder.push(lineIndex, match.index, match[0].length, 3, 2 ** 1);
                    if (replacementOctave !== undefined) {
                      replacementOctave.octave = 1;
                      replacementOctave.isAbsolute = true;
                    } else {
                      octave = 1;
                    }
                  } else if (6 < parseInt(match.groups.num)) {
                    builder.push(lineIndex, match.index, match[0].length, 3, 2 ** 6);
                    if (replacementOctave !== undefined) {
                      replacementOctave.octave = 6;
                      replacementOctave.isAbsolute = true;
                    } else {
                      octave = 6;
                    }
                  } else {
                    builder.push(lineIndex, match.index, match[0].length, 3, 2 ** parseInt(match.groups.num));
                    if (replacementOctave !== undefined) {
                      replacementOctave.octave = parseInt(match.groups.num);
                      replacementOctave.isAbsolute = true;
                    } else {
                      octave = parseInt(match.groups.num);
                    }
                  }
                }
              }
            }

            if (!isHex && hexMatch !== undefined) {
              hexCount = 0;
              hexMatch = undefined;
            }
            previousMatch = match;
          }
        }

        function getRegexMap(): RegExp {
          let regexMapArray = Array.from(regexArray);
          if (replacementMap.size > 0) {
            regexMapArray.unshift("(?<replacementCall>" + [...replacementMap.keys()].join("|") + ")");
          }
          let regex = new RegExp(regexMapArray.join("|"), "g");
          regex.lastIndex = lastIndex;
          return regex;
        }
      }

      resolve(builder.build());
    });
  }
}

export function activateTokenizer(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: "mml" }, new MmlSemanticTokensProvider(), legend));
}
