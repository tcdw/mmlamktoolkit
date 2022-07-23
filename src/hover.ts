import * as vscode from "vscode";
import { regexMap, hoverMap, CurlyBracesType } from "./map";

export class MmlHoverProvider {
  provideHover(doc: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
    //Space check
    if (/^\s$/.test(doc.lineAt(position.line).text[position.character])) {
      return Promise.reject("no word here");
    }

    //Document variables
    let curlyBracesType: CurlyBracesType = "NONE";

    let hover = undefined;

    let previousMatch = undefined;

    //Pitch check
    let octave = 4;

    //RemoteCode
    let inRemoteCode = false;
    let remoteCodeKey = 0;
    let remoteCodeValue = "";
    let remoteCodeLineIndex = 0;
    let remoteCodeMatch = undefined;
    let remoteCodeMap: Map<number, string> = new Map();

    //LabelLoop
    let inLabelLoop = false;
    let labelLoopKey = 0;
    let labelLoopValue = "";
    let labelLoopLineIndex = 0;
    let labelLoopMatch = undefined;
    let labelLoopMap: Map<number, string> = new Map();

    //Loop
    let inLoop = false;
    let loopValue = "";
    let loopLineIndex = 0;
    let loopMatch = undefined;

    //CurlyBraces
    let inCurlyBraces = false;

    //Replacement
    let inReplacement = false;
    let replacementKey = "";
    let replacementValue = "";
    let replacementLineIndex = 0;
    let replacementMatch = undefined;
    let replacementMap: { key: string; value: string }[] = [];
    let replacementIndexShiftArray: { start: number; keyName: string; endValue: number; shift: number }[][] = new Array();

    //Instrument
    let instrumentMap: Map<number, string> = new Map();
    instrumentMap.set(0, "00 SMW @0.brr");
    instrumentMap.set(1, "01 SMW @1.brr");
    instrumentMap.set(2, "02 SMW @2.brr");
    instrumentMap.set(3, "03 SMW @3.brr");
    instrumentMap.set(4, "04 SMW @4.brr");
    instrumentMap.set(5, "07 SMW @5.brr");
    instrumentMap.set(6, "08 SMW @6.brr");
    instrumentMap.set(7, "09 SMW @7.brr");
    instrumentMap.set(8, "05 SMW @8.brr");
    instrumentMap.set(9, "0A SMW @9.brr");
    instrumentMap.set(10, "0B SMW @10.brr");
    instrumentMap.set(11, "01 SMW @1.brr");
    instrumentMap.set(12, "10 SMW @12.brr");
    instrumentMap.set(13, "0C SMW @13.brr");
    instrumentMap.set(14, "0D SMW @14.brr");
    instrumentMap.set(15, "12 SMW @15.brr");
    instrumentMap.set(16, "0C SMW @13.brr");
    instrumentMap.set(17, "11 SMW @17.brr");
    instrumentMap.set(18, "01 SMW @1.brr");
    instrumentMap.set(21, "0F SMW @21.brr");
    instrumentMap.set(22, "06 SMW @22.brr");
    instrumentMap.set(23, "06 SMW @22.brr");
    instrumentMap.set(24, "0E SMW @29.brr");
    instrumentMap.set(25, "0E SMW @29.brr");
    instrumentMap.set(26, "0B SMW @10.brr");
    instrumentMap.set(27, "0B SMW @10.brr");
    instrumentMap.set(28, "0B SMW @10.brr");
    instrumentMap.set(29, "0E SMW @29.brr");
    let currentInstrument = "";
    let instrumentCount = 0;

    //HexCommand
    let hexCount = 0;
    let hexMatch = undefined;
    let hexSecondMatch = undefined;
    let arpeggioCount = 0;

    for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
      let text = doc.lineAt(lineIndex).text;
      replacementIndexShiftArray.push(new Array());

      //Line-by-line variables

      //Quotation
      let quotationMatch = undefined;

      //Exclude comment(;)
      if (text.includes(";")) {
        const index = text.indexOf(";");
        if (index === 0) {
          continue;
        }
        text = text.substring(0, index);
      }

      //Replacement check
      let replacementKeyMatch: RegExpExecArray | null;
      let lastIndex = 0;
      while (replacementMap.length > 0 && (replacementKeyMatch = getReplacementRegexMap().exec(text)) !== null) {
        for (const r of replacementMap) {
          if (replacementKeyMatch !== null && r.key === replacementKeyMatch[0]) {
            let replacementDefRegex = /(?<=\").+(?=\=.*\")/g;
            let inReplacementDef = false;
            let replacementDefMatch;
            while ((replacementDefMatch = replacementDefRegex.exec(text)) !== null) {
              if (replacementDefMatch.index <= replacementKeyMatch.index && replacementKeyMatch.index <= replacementDefMatch.index + replacementDefMatch[0].length) {
                lastIndex = replacementDefMatch.index + replacementDefMatch[0].length;
                inReplacementDef = true;
                break;
              }
            }
            if (!inReplacementDef) {
              replacementIndexShiftArray[lineIndex].push({ start: replacementKeyMatch.index, keyName: r.key, endValue: replacementKeyMatch.index + r.value.length, shift: r.key.length - r.value.length });
              text = text.substring(0, replacementKeyMatch.index) + r.value + text.substring(replacementKeyMatch.index + r.key.length);
            }
          }
        }
      }

      function getReplacementRegexMap(): RegExp {
        let regex = RegExp(replacementMap.map((r) => escapeRegex(r.key)).join("|"), "g");
        regex.lastIndex = lastIndex;
        return regex;
      }

      function escapeRegex(str: string): string {
        str = str.replace("\\", "\\\\");
        str = str.replace("*", "\\*");
        str = str.replace("+", "\\+");
        str = str.replace(".", "\\.");
        str = str.replace("?", "\\?");
        str = str.replace("{", "\\{");
        str = str.replace("}", "\\}");
        str = str.replace("(", "\\(");
        str = str.replace(")", "\\)");
        str = str.replace("[", "\\[");
        str = str.replace("]", "\\]");
        str = str.replace("^", "\\^");
        str = str.replace("$", "\\$");
        str = str.replace("-", "\\-");
        str = str.replace("|", "\\|");
        str = str.replace("/", "\\/");
        return str;
      }

      //Repeat until there are no matching words
      let match;
      lastIndex = 0;
      while ((match = getRegexMap().exec(text)) !== null) {
        if (match.groups !== undefined) {
          //Match variables
          lastIndex = match.index + match[0].length;
          let isHex = false;

          switch (curlyBracesType) {
            //in #samples
            case "SAMPLES":
              //curlyBracesBegin({)
              if (match.groups.curlyBracesBegin !== undefined) {
                inCurlyBraces = true;
              }

              //curlyBracesEnd(})
              else if (match.groups.curlyBracesEnd !== undefined) {
                inCurlyBraces = false;
                curlyBracesType = "NONE";
              }

              //inCurlyBraces check
              else if (inCurlyBraces) {
                //quotation(")
                if (match.groups.quotation !== undefined) {
                  if (quotationMatch === undefined) {
                    quotationMatch = match;
                  } else {
                    quotationMatch = undefined;
                  }
                }

                //quotationMatch check
                else if (quotationMatch === undefined) {
                  //signSampleGroup(#)
                  if (match.groups.signAny !== undefined) {
                    if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signSampleGroup)) !== undefined) {
                      return hover;
                    }
                  }
                }
              }
              break;

            //in #instruments
            case "INSTRUMENTS":
              //curlyBracesBegin({)
              if (match.groups.curlyBracesBegin !== undefined) {
                inCurlyBraces = true;
              }

              //curlyBracesEnd(})
              else if (match.groups.curlyBracesEnd !== undefined) {
                inCurlyBraces = false;
                curlyBracesType = "NONE";
              }

              //inCurlyBraces check
              else if (inCurlyBraces) {
                //quotation(")
                if (match.groups.quotation !== undefined) {
                  if (quotationMatch === undefined) {
                    quotationMatch = match;
                  } else {
                    instrumentMap.set(instrumentCount + 30, text.substring(quotationMatch.index + 1, match.index));
                    instrumentCount++;
                    quotationMatch = undefined;
                  }
                }

                //quotationMatch check
                else if (quotationMatch === undefined) {
                  //instrument(@)
                  if (match.groups.instrument !== undefined) {
                    let instrument = instrumentMap.get(parseInt(match.groups.instrumentValue));
                    if (instrument !== undefined) {
                      instrumentMap.set(instrumentCount + 30, instrument);
                      instrumentCount++;
                    }
                  }

                  //noise(n)
                  else if (match.groups.noise !== undefined) {
                    instrumentMap.set(instrumentCount + 30, match[0]);
                    instrumentCount++;
                  }

                  //hexCommand($)
                  else if (match.groups.hexCommand !== undefined) {
                    //Before loading the sample
                    if (previousMatch?.groups?.curlyBracesBegin === undefined && hexCount < 5) {
                      switch (hexCount) {
                        case 0:
                          hexMatch = match;
                          if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signInstrumentsHexAA)) !== undefined) {
                            return hover;
                          }
                          break;
                        case 1:
                          if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signInstrumentsHexBB)) !== undefined) {
                            return hover;
                          }
                          break;
                        case 2:
                          if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signInstrumentsHexCC)) !== undefined) {
                            return hover;
                          }
                          break;
                        case 3:
                          if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signInstrumentsHexDD)) !== undefined) {
                            return hover;
                          }
                          break;
                        case 4:
                          if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signInstrumentsHexEE)) !== undefined) {
                            return hover;
                          }
                          break;
                      }
                      hexCount++;
                    }
                    isHex = true;
                  }
                }
              }
              break;

            //in #spc
            case "SPC":
              //curlyBracesBegin({)
              if (match.groups.curlyBracesBegin !== undefined) {
                inCurlyBraces = true;
              }

              //curlyBracesEnd(})
              else if (match.groups.curlyBracesEnd !== undefined) {
                inCurlyBraces = false;
                curlyBracesType = "NONE";
              }

              //inCurlyBraces check
              else if (inCurlyBraces) {
                //quotation(")
                if (match.groups.quotation !== undefined) {
                  if (quotationMatch === undefined) {
                    quotationMatch = match;
                  } else {
                    quotationMatch = undefined;
                  }
                }

                //quotationMatch check
                else if (quotationMatch === undefined) {
                  //signInfo(#)
                  if (match.groups.signInfo !== undefined) {
                    switch (match.groups.signInfo) {
                      case "#author":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signAuthor)) !== undefined) {
                          return hover;
                        }
                        break;
                      case "#game":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signGame)) !== undefined) {
                          return hover;
                        }
                        break;
                      case "#comment":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signComment)) !== undefined) {
                          return hover;
                        }
                        break;
                      case "#title":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signTitle)) !== undefined) {
                          return hover;
                        }
                        break;
                    }
                  }

                  //signLength(#length)
                  else if (match.groups.signLength !== undefined) {
                    if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signLength)) !== undefined) {
                      return hover;
                    }
                  }
                }
              }
              break;

            //in otherwise
            case "NONE":
              //replacementBegin("=)
              if (match.groups.replacementBegin !== undefined) {
                if (!inReplacement) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.replacement)) !== undefined) {
                    return hover;
                  }

                  inReplacement = true;
                  replacementKey = match.groups.replacementBeginValue;
                  replacementLineIndex = lineIndex;
                  replacementMatch = match;
                  currentInstrument = "";
                }
              }

              //quotation(")
              else if (match.groups.quotation !== undefined) {
                if (inReplacement) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.replacement)) !== undefined) {
                    return hover;
                  }

                  if (lineIndex === replacementLineIndex) {
                    replacementValue = text.substring((replacementMatch as RegExpExecArray).index + (replacementMatch as RegExpExecArray)[0].length, match.index);
                  } else {
                    replacementValue += " " + text.substring(0, match.index);
                  }
                  if (replacementKey !== "") {
                    let index: number | undefined = undefined;
                    for (const r of replacementMap) {
                      if (replacementKey.includes(r.key)) {
                        index = replacementMap.indexOf(r);
                        break;
                      }
                    }
                    if (index !== undefined) {
                      replacementMap.splice(index, 0, { key: replacementKey, value: replacementValue });
                    } else {
                      replacementMap.push({ key: replacementKey, value: replacementValue });
                    }
                  }
                  inReplacement = false;
                  replacementKey = "";
                  replacementValue = "";

                  octave = 4;
                  inRemoteCode = false;
                  inLabelLoop = false;
                  inLoop = false;
                  inCurlyBraces = false;
                } else if (quotationMatch === undefined) {
                  quotationMatch = match;
                } else {
                  quotationMatch = undefined;
                }
              }

              //quotationMatch check
              else if (quotationMatch === undefined) {
                //signSamples(#samples)
                if (match.groups.signSamples !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signSamples)) !== undefined) {
                    return hover;
                  }

                  curlyBracesType = "SAMPLES";
                }

                //signInstruments(#instruments)
                else if (match.groups.signInstruments !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signInstruments)) !== undefined) {
                    return hover;
                  }

                  curlyBracesType = "INSTRUMENTS";
                }

                //signSpc(#Spc)
                else if (match.groups.signSpc !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signSpc)) !== undefined) {
                    return hover;
                  }

                  curlyBracesType = "SPC";
                }

                //signPath(#Path)
                else if (match.groups.signPath !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signPath)) !== undefined) {
                    return hover;
                  }
                }

                //signAmk(#amk)
                else if (match.groups.signAmk !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signAmk)) !== undefined) {
                    return hover;
                  }
                }

                //signPad(#pad)
                else if (match.groups.signPad !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signPad)) !== undefined) {
                    return hover;
                  }
                }

                //signHalvetempo(#halvetempo)
                else if (match.groups.signHalvetempo !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signHalvetempo)) !== undefined) {
                    return hover;
                  }
                }

                //signOption(#option)
                else if (match.groups.signOption !== undefined) {
                  switch (match.groups.signOptionValue.toLowerCase()) {
                    case "tempoimmunity":
                      if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signOption + hoverMap.signOptionTempoimmunity)) !== undefined) {
                        return hover;
                      }
                      break;
                    case "dividetempo":
                      if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signOption + hoverMap.signOptionDividetempo)) !== undefined) {
                        return hover;
                      }
                      break;
                    case "smwvtable":
                      if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signOption + hoverMap.signOptionSmwvtable)) !== undefined) {
                        return hover;
                      }
                      break;
                    case "noloop":
                      if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signOption + hoverMap.signOptionNoloop)) !== undefined) {
                        return hover;
                      }
                      break;
                    default:
                      if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signOption)) !== undefined) {
                        return hover;
                      }
                      break;
                  }
                }

                //signDefine(#define)
                else if (match.groups.signDefine !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signDefine)) !== undefined) {
                    return hover;
                  }
                }

                //signUndef(#undef)
                else if (match.groups.signUndef !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signUndef)) !== undefined) {
                    return hover;
                  }
                }

                //signIfdef(#ifdef)
                else if (match.groups.signIfdef !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signIfdef)) !== undefined) {
                    return hover;
                  }
                }

                //signIfndef(#ifndef)
                else if (match.groups.signIfndef !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signIfndef)) !== undefined) {
                    return hover;
                  }
                }

                //signIf(#if)
                else if (match.groups.signIf !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signIf)) !== undefined) {
                    return hover;
                  }
                }

                //signEndif(#endif)
                else if (match.groups.signEndif !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signEndif)) !== undefined) {
                    return hover;
                  }
                }

                //signError(#error)
                else if (match.groups.signError !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.signError)) !== undefined) {
                    return hover;
                  }
                }

                //channel(#)
                else if (match.groups.channel !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.channel)) !== undefined) {
                    return hover;
                  }

                  inRemoteCode = false;
                  inLabelLoop = false;
                  inLoop = false;
                  let instrument = instrumentMap.get(0);
                  if (instrument !== undefined) {
                    currentInstrument = instrument;
                  } else {
                    currentInstrument = "";
                  }
                }

                //sampleLoad(("",$))
                else if (match.groups.sampleLoad !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.sampleLoad)) !== undefined) {
                    return hover;
                  }

                  currentInstrument = match.groups.sampleLoadValue1;
                }

                //remoteCodeDefBegin((!)[)
                else if (match.groups.remoteCodeDefBegin !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.remoteCodeDef)) !== undefined) {
                    return hover;
                  }

                  if (!inRemoteCode) {
                    inRemoteCode = true;
                    remoteCodeKey = parseInt(match.groups.remoteCodeDefBeginValue);
                    remoteCodeLineIndex = lineIndex;
                    remoteCodeMatch = match;
                  }
                }

                //remoteCodeCall((!,))
                else if (match.groups.remoteCodeCall !== undefined) {
                  let typeDiscription = "";
                  let remoteCode = remoteCodeMap.get(parseInt(match.groups.remoteCodeCallValue1));
                  switch (parseInt(match.groups.remoteCodeCallValue2)) {
                    case -1:
                      typeDiscription = hoverMap.remoteCodeCallTypem1;
                      break;
                    case 0:
                      typeDiscription = hoverMap.remoteCodeCallType0;
                      break;
                    case 1:
                      typeDiscription = hoverMap.remoteCodeCallType1;
                      break;
                    case 2:
                      typeDiscription = hoverMap.remoteCodeCallType2;
                      break;
                    case 3:
                      typeDiscription = hoverMap.remoteCodeCallType3;
                      break;
                    case 4:
                      typeDiscription = hoverMap.remoteCodeCallType4;
                      break;
                    case 5:
                      typeDiscription = hoverMap.remoteCodeCallType5;
                      break;
                  }

                  if (remoteCode === undefined) {
                    if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.remoteCodeCall + typeDiscription + hoverMap.remoteCodeCallExample)) !== undefined) {
                      return hover;
                    }
                  } else {
                    if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.remoteCodeCall + typeDiscription + hoverMap.remoteCodeCallExample + "\n\n*Value :*\n```\n" + remoteCode + "\n```")) !== undefined) {
                      return hover;
                    }
                  }
                }

                //superLoopBegin([[)
                else if (match.groups.superLoopBegin !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.superLoop)) !== undefined) {
                    return hover;
                  }
                }

                //labelLoopBegin(()[)
                else if (match.groups.labelLoopBegin !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.labelLoop)) !== undefined) {
                    return hover;
                  }

                  if (!inLabelLoop) {
                    inLabelLoop = true;
                    labelLoopKey = parseInt(match.groups.labelLoopBeginValue);
                    labelLoopLineIndex = lineIndex;
                    labelLoopMatch = match;
                  }
                }

                //labelLoopCall(())
                else if (match.groups.labelLoopCall !== undefined) {
                  let labelLoop = labelLoopMap.get(parseInt(match.groups.labelLoopCallValue1));
                  if (labelLoop === undefined) {
                    if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.labelLoopCall)) !== undefined) {
                      return hover;
                    }
                  } else {
                    if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.labelLoopCall + "\n\n*Value :*\n```\n" + labelLoop + "\n```")) !== undefined) {
                      return hover;
                    }
                  }
                }

                //loopBegin([)
                else if (match.groups.loopBegin !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.loop)) !== undefined) {
                    return hover;
                  }

                  if (!inLoop) {
                    inLoop = true;
                    loopLineIndex = lineIndex;
                    loopMatch = match;
                  }
                }

                //superLoopEnd(]])
                else if (match.groups.superLoopEnd !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.superLoop)) !== undefined) {
                    return hover;
                  }
                }

                //loopEnd(])
                else if (match.groups.loopEnd !== undefined) {
                  if (inRemoteCode) {
                    if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.remoteCodeDef)) !== undefined) {
                      return hover;
                    }

                    if (lineIndex === remoteCodeLineIndex) {
                      remoteCodeValue = text.substring((remoteCodeMatch as RegExpExecArray).index + (remoteCodeMatch as RegExpExecArray)[0].length, match.index);
                    } else {
                      remoteCodeValue += " " + text.substring(0, match.index);
                    }
                    remoteCodeMap.set(remoteCodeKey, remoteCodeValue);
                    inRemoteCode = false;
                    remoteCodeKey = 0;
                    remoteCodeValue = "";
                  } else if (inLabelLoop) {
                    if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.labelLoop)) !== undefined) {
                      return hover;
                    }

                    if (lineIndex === labelLoopLineIndex) {
                      labelLoopValue = text.substring((labelLoopMatch as RegExpExecArray).index + (labelLoopMatch as RegExpExecArray)[0].length, match.index);
                    } else {
                      labelLoopValue += " " + text.substring(0, match.index);
                    }
                    labelLoopMap.set(labelLoopKey, labelLoopValue);
                    loopValue = labelLoopValue;
                    inLabelLoop = false;
                    labelLoopKey = 0;
                    labelLoopValue = "";
                  } else if (inLoop) {
                    if (lineIndex === loopLineIndex) {
                      if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.loop)) !== undefined) {
                        return hover;
                      }

                      loopValue = text.substring((loopMatch as RegExpExecArray).index + (loopMatch as RegExpExecArray)[0].length, match.index);
                    } else {
                      loopValue += " " + text.substring(0, match.index);
                    }
                    inLoop = false;
                  }
                }

                //loopRecall(*)
                else if (match.groups.loopRecall !== undefined) {
                  if (loopValue === "") {
                    if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.loopRecall)) !== undefined) {
                      return hover;
                    }
                  } else {
                    if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.loopRecall + "\n\n*Value :*\n```\n" + loopValue + "\n```")) !== undefined) {
                      return hover;
                    }
                  }
                }

                //curlyBracesBegin({)
                else if (match.groups.curlyBracesBegin !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.curlyBraces)) !== undefined) {
                    return hover;
                  }

                  inCurlyBraces = true;
                }

                //curlyBracesEnd(})
                else if (match.groups.curlyBracesEnd !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.curlyBraces)) !== undefined) {
                    return hover;
                  }

                  inCurlyBraces = false;
                }

                //hexCommand($)
                else if (match.groups.hexCommand !== undefined) {
                  if (hexMatch === undefined) {
                    hexMatch = match;
                    hexCount = 0;
                  }
                  if (hexCount === 1) {
                    hexSecondMatch = match;
                  }

                  if (hexMatch.groups !== undefined) {
                    switch (hexMatch.groups.hexCommandValue.toUpperCase()) {
                      //Instrument
                      case "DA":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandDA)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 1) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Pan
                      case "DB":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandDB)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 1) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Pan fade
                      case "DC":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandDC)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 2) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Pitch bend
                      case "DD":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandDD)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 3) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Vibrato
                      case "DE":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandDE)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 3) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Vibrato off
                      case "DF":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandDF)) !== undefined) {
                          return hover;
                        }

                        hexMatch = undefined;
                        break;

                      //Global volume
                      case "E0":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandE0)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 1) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Global volume fade
                      case "E1":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandE1)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 2) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Tempo
                      case "E2":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandE2)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 1) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Tempo fade
                      case "E3":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandE3)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 2) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Global transpose
                      case "E4":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandE4)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 1) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Tremolo
                      case "E5":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandE5)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 3) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Subloop
                      case "E6":
                        if (hexCount >= 1) {
                          //Subloop start
                          if (0 === parseInt("0x" + match.groups.hexCommandValue, 16)) {
                            if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandE600)) !== undefined) {
                              return hover;
                            }
                          }
                          //Subloop end
                          else {
                            if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandE6XX)) !== undefined) {
                              return hover;
                            }
                          }
                          hexMatch = undefined;
                        } else {
                          if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandE6)) !== undefined) {
                            return hover;
                          }
                        }
                        hexCount++;
                        break;

                      //Volume
                      case "E7":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandE7)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 1) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Volume fade
                      case "E8":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandE8)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 2) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Loop
                      case "E9":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandE9)) !== undefined) {
                          return hover;
                        }

                        hexMatch = undefined;
                        break;

                      //Vibrato fade
                      case "EA":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandEA)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 1) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Pitch envelope (release)
                      case "EB":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandEB)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 3) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Pitch envelope (attack)
                      case "EC":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandEC)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 3) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //ADSR,GAIN
                      case "ED":
                        if (hexCount >= 1) {
                          //GAIN
                          if (128 === parseInt("0x" + hexSecondMatch?.groups?.hexCommandValue, 16)) {
                            if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandED80)) !== undefined) {
                              return hover;
                            }
                          }
                          //ADSR
                          else {
                            if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandEDXX)) !== undefined) {
                              return hover;
                            }
                          }

                          if (hexCount >= 2) {
                            hexMatch = undefined;
                          }
                        } else {
                          if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandED)) !== undefined) {
                            return hover;
                          }
                        }
                        hexCount++;
                        break;

                      //Tune channel
                      case "EE":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandEE)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 1) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Echo 1
                      case "EF":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandEF)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 3) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Echo off
                      case "F0":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandF0)) !== undefined) {
                          return hover;
                        }

                        hexMatch = undefined;
                        break;

                      //Echo 2
                      case "F1":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandF1)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 3) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Echo fade
                      case "F2":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandF2)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 3) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Sample load
                      case "F3":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandF3)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 2) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Misc 1
                      case "F4":
                        if (hexCount >= 1) {
                          switch (parseInt("0x" + match.groups.hexCommandValue, 16)) {
                            case 0:
                              if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandF400)) !== undefined) {
                                return hover;
                              }
                              break;
                            case 1:
                              if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandF401)) !== undefined) {
                                return hover;
                              }
                              break;
                            case 2:
                              if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandF402)) !== undefined) {
                                return hover;
                              }
                              break;
                            case 3:
                              if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandF403)) !== undefined) {
                                return hover;
                              }
                              break;
                            case 5:
                              if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandF405)) !== undefined) {
                                return hover;
                              }
                              break;
                            case 6:
                              if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandF406)) !== undefined) {
                                return hover;
                              }
                              break;
                            case 7:
                              if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandF407)) !== undefined) {
                                return hover;
                              }
                              break;
                            case 8:
                              if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandF408)) !== undefined) {
                                return hover;
                              }
                              break;
                            case 9:
                              if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandF409)) !== undefined) {
                                return hover;
                              }
                              break;
                            default:
                              if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandF4)) !== undefined) {
                                return hover;
                              }
                              break;
                          }
                          hexMatch = undefined;
                        } else {
                          if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandF4)) !== undefined) {
                            return hover;
                          }
                        }
                        hexCount++;
                        break;

                      //FIR filter
                      case "F5":
                        if (hexCount >= 8) {
                          if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandF5)) !== undefined) {
                            return hover;
                          }

                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //DSP write
                      case "F6":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandF6)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 2) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Enable noise
                      case "F8":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandF8)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 1) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Data send
                      case "F9":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandF9)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 2) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Misc 2
                      case "FA":
                        if (hexCount >= 1) {
                          switch (parseInt("0x" + hexSecondMatch?.groups?.hexCommandValue, 16)) {
                            case 0:
                              if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandFA00)) !== undefined) {
                                return hover;
                              }
                              break;
                            case 1:
                              if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandFA01)) !== undefined) {
                                return hover;
                              }
                              break;
                            case 2:
                              if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandFA02)) !== undefined) {
                                return hover;
                              }
                              break;
                            case 3:
                              if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandFA03)) !== undefined) {
                                return hover;
                              }
                              break;
                            case 4:
                              if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandFA04)) !== undefined) {
                                return hover;
                              }
                              break;
                            default:
                              if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandFA)) !== undefined) {
                                return hover;
                              }
                              break;
                          }

                          if (hexCount >= 2) {
                            hexMatch = undefined;
                          }
                        } else {
                          if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandFA)) !== undefined) {
                            return hover;
                          }
                        }
                        hexCount++;
                        break;

                      //Misc 3
                      case "FB":
                        if (hexCount >= 1) {
                          switch (parseInt("0x" + hexSecondMatch?.groups?.hexCommandValue, 16)) {
                            case 128:
                              if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandFB80)) !== undefined) {
                                return hover;
                              }
                              break;
                            case 129:
                              if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandFB81)) !== undefined) {
                                return hover;
                              }
                              break;
                            default:
                              if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandFBXX)) !== undefined) {
                                return hover;
                              }
                              break;
                          }

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
                        } else {
                          if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandFB)) !== undefined) {
                            return hover;
                          }
                        }
                        hexCount++;
                        break;

                      //Remote commands
                      case "FC":
                        if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.hexCommandFC)) !== undefined) {
                          return hover;
                        }

                        if (hexCount >= 4) {
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;
                    }
                  }
                  isHex = true;
                }

                //quantization(q)
                else if (match.groups.quantization !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.quantization)) !== undefined) {
                    return hover;
                  }
                }

                //noise(n)
                else if (match.groups.noise !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.noise)) !== undefined) {
                    return hover;
                  }

                  currentInstrument = match[0];
                }

                //note(a-g)
                else if (match.groups.note !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.note + "\n\n*Octave* : " + octave + "\n\n*Instrument* : " + currentInstrument)) !== undefined) {
                    return hover;
                  }
                }

                //rest(r)
                else if (match.groups.rest !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.rest)) !== undefined) {
                    return hover;
                  }
                }

                //tie(^)
                else if (match.groups.tie !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.note + "\n\n*Octave* : " + octave + "\n\n*Instrument* : " + currentInstrument)) !== undefined) {
                    return hover;
                  }
                }

                //tune(h)
                else if (match.groups.tune !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.tune)) !== undefined) {
                    return hover;
                  }
                }

                //octave(o)
                else if (match.groups.octave !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.octave)) !== undefined) {
                    return hover;
                  }

                  //Range check(1-6)
                  if (1 <= parseInt(match.groups.octaveValue) && parseInt(match.groups.octaveValue) <= 6) {
                    octave = parseInt(match.groups.octaveValue);
                  }
                }

                //defaultLength(l)
                else if (match.groups.defaultLength !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.defaultLength)) !== undefined) {
                    return hover;
                  }
                }

                //instrument(@)
                else if (match.groups.instrument !== undefined) {
                  let instrument = instrumentMap.get(parseInt(match.groups.instrumentValue));
                  if (instrument !== undefined) {
                    currentInstrument = instrument;
                  } else {
                    currentInstrument = "";
                  }

                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.instrument + "\n\n*Instrument* : " + currentInstrument)) !== undefined) {
                    return hover;
                  }
                }

                //volume(v)
                else if (match.groups.volume !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.volume)) !== undefined) {
                    return hover;
                  }
                }

                //globalVolume(w)
                else if (match.groups.globalVolume !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.globalVolume)) !== undefined) {
                    return hover;
                  }
                }

                //pan(y)
                else if (match.groups.pan !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.pan)) !== undefined) {
                    return hover;
                  }
                }

                //tempo(t)
                else if (match.groups.tempo !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.tempo)) !== undefined) {
                    return hover;
                  }
                }

                //vibrato(p)
                else if (match.groups.vibrato !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.vibrato)) !== undefined) {
                    return hover;
                  }
                }

                //octaveLower(<)
                else if (match.groups.octaveLower !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.octaveLower)) !== undefined) {
                    return hover;
                  }

                  octave--;
                }

                //octaveRaise(>)
                else if (match.groups.octaveRaise !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.octaveRaise)) !== undefined) {
                    return hover;
                  }

                  octave++;
                }

                //pitchSlide(&)
                else if (match.groups.pitchSlide !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.pitchSlide)) !== undefined) {
                    return hover;
                  }
                }

                //noLoop(?)
                else if (match.groups.noLoop !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.noLoop)) !== undefined) {
                    return hover;
                  }
                }

                //loopPoint(/)
                else if (match.groups.loopPoint !== undefined) {
                  if ((hover = hoverCheck(lineIndex, match.index, match[0], hoverMap.loopPoint)) !== undefined) {
                    return hover;
                  }
                }
              }

              break;
          }

          if (!isHex && hexMatch !== undefined) {
            hexCount = 0;
            hexMatch = undefined;
            hexSecondMatch = undefined;
          }

          previousMatch = match;
        }
      }

      if (inReplacement) {
        if (lineIndex === replacementLineIndex) {
          replacementValue = text.substring((replacementMatch as RegExpExecArray).index + (replacementMatch as RegExpExecArray)[0].length);
        } else {
          replacementValue += " " + text;
        }
      }

      /**
       * Get RegexMap from CurlyBracesType
       * @param curlyBracesType
       * @param lastIndex
       * @returns
       */
      function getRegexMap(): RegExp {
        let regex: RegExp;
        switch (curlyBracesType) {
          case "SAMPLES":
            regex = new RegExp([regexMap.curlyBracesBegin, regexMap.curlyBracesEnd, regexMap.quotation, regexMap.signAny, regexMap.anything].join("|"), "g");
            break;
          case "INSTRUMENTS":
            regex = new RegExp([regexMap.curlyBracesBegin, regexMap.curlyBracesEnd, regexMap.quotation, regexMap.instrument, regexMap.noise, regexMap.hexCommand, regexMap.anything].join("|"), "g");
            break;
          case "SPC":
            regex = new RegExp([regexMap.curlyBracesBegin, regexMap.curlyBracesEnd, regexMap.quotation, regexMap.signInfo, regexMap.signLength, regexMap.signAny, regexMap.anything].join("|"), "g");
            break;
          default:
            regex = new RegExp(
              [
                regexMap.replacementBegin,
                regexMap.quotation,
                regexMap.signSamples,
                regexMap.signInstruments,
                regexMap.signSpc,
                regexMap.signPath,
                regexMap.signAmk,
                regexMap.signPad,
                regexMap.signHalvetempo,
                regexMap.signOption,
                regexMap.signDefine,
                regexMap.signUndef,
                regexMap.signIfdef,
                regexMap.signIfndef,
                regexMap.signIf,
                regexMap.signEndif,
                regexMap.signError,
                regexMap.channel,
                regexMap.signAny,
                regexMap.sampleLoad,
                regexMap.illegalLoopBegin,
                regexMap.remoteCodeDefBegin,
                regexMap.remoteCodeCall,
                regexMap.superLoopBegin,
                regexMap.labelLoopBegin,
                regexMap.labelLoopCall,
                regexMap.loopBegin,
                regexMap.illegalLoopEnd,
                regexMap.superLoopEnd,
                regexMap.loopEnd,
                regexMap.loopRecall,
                regexMap.curlyBracesBegin,
                regexMap.curlyBracesEnd,
                regexMap.hexCommand,
                regexMap.quantization,
                regexMap.noise,
                regexMap.note,
                regexMap.rest,
                regexMap.tie,
                regexMap.tune,
                regexMap.octave,
                regexMap.defaultLength,
                regexMap.instrument,
                regexMap.volume,
                regexMap.globalVolume,
                regexMap.pan,
                regexMap.tempo,
                regexMap.vibrato,
                regexMap.octaveLower,
                regexMap.octaveRaise,
                regexMap.pitchSlide,
                regexMap.noLoop,
                regexMap.loopPoint,
                regexMap.anything,
              ].join("|"),
              "g"
            );
            break;
        }
        regex.lastIndex = lastIndex;
        return regex;
      }
    }

    function getShiftedIndex(lineIndex: number, index: number): { index: number; keyName: string | undefined } {
      let shift = 0;
      for (const replacementIndexShift of replacementIndexShiftArray[lineIndex]) {
        //pre replacement
        if (index < replacementIndexShift.start) {
          return { index: index + shift, keyName: undefined };
        }
        //in replacement
        else if (index < replacementIndexShift.endValue) {
          return { index: replacementIndexShift.start + shift, keyName: replacementIndexShift.keyName };
        }
        //post replacement
        else {
          shift += replacementIndexShift.shift;
        }
      }
      return { index: index + shift, keyName: undefined };
    }

    function hoverCheck(lineIndex: number, index: number, matchName: string, hoverText: string): vscode.ProviderResult<vscode.Hover> | undefined {
      let shiftedIndex = getShiftedIndex(lineIndex, index);
      if (position.line > lineIndex) {
        return undefined;
      } else if (position.line < lineIndex) {
        return Promise.reject("no word here");
      } else {
        if (shiftedIndex.keyName === undefined) {
          if (position.character > shiftedIndex.index + matchName.length) {
            return undefined;
          } else if (position.character < shiftedIndex.index) {
            return Promise.reject("no word here");
          } else {
            return Promise.resolve(new vscode.Hover(hoverText));
          }
        } else {
          let replacement = replacementMap.filter((r) => r.key === shiftedIndex.keyName)[0];
          if (replacement !== undefined) {
            if (position.character > shiftedIndex.index + shiftedIndex.keyName.length) {
              return undefined;
            } else if (position.character < shiftedIndex.index) {
              return Promise.reject("no word here");
            } else {
              return Promise.resolve(new vscode.Hover("**Replacement call**\n\n*Value :*\n```\n" + replacement.value + "\n```"));
            }
          }
        }
      }
      return undefined;
    }
  }
}
