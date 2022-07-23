import * as vscode from "vscode";
import * as fs from "fs";
import { regexMap, CurlyBracesType } from "./map";

/**
 * Analyzes the text document for problems.
 * @param doc
 * @param mmlDiagnostics
 */
function refreshDiagnostics(doc: vscode.TextDocument, mmlDiagnostics: vscode.DiagnosticCollection): void {
  const diagnostics: vscode.Diagnostic[] = [];

  //Document variables
  let curlyBracesType: CurlyBracesType = "NONE";

  let previousLineIndex = 0;
  let previousMatch = undefined;

  //signAmk
  let existAmk = false;

  //Define
  let defineArray: { var: string; value: number }[] = new Array();
  let defineIfDepth = 0;
  let defineIfLineIndex = 0;
  let defineIfMatch = undefined;

  //Channel
  let inChannel = false;

  //Pitch check
  let octave = 4;
  let pitch = 0;
  let tune = 0;

  //RemoteCode
  let remoteCodeArray: number[] = new Array();

  //SuperLoop
  let inSuperLoop = false;
  let superLoopLineIndex = 0;
  let superLoopMatch = undefined;

  //LabelLoop
  let labelLoopArray: number[] = new Array();

  //Loop
  let inLoop = false;
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
  let replacementIndexShiftArray: { start: number; endKey: number; endValue: number; shift: number }[][] = new Array();

  //Sample
  let samplePath = "";
  let sampleArray: string[] = new Array();

  //Instrument
  let instrumentCount = 0;

  //Special
  let specialLineIndex = 0;
  let specialMatch = undefined;
  let isSpecialLength = false;

  //HexCommand
  let hexCount = 0;
  let hexLineIndex = 0;
  let hexMatch = undefined;
  let arpeggioCount = 0;

  for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
    let text = doc.lineAt(lineIndex).text;
    replacementIndexShiftArray.push(new Array());

    //Line-by-line variables

    //Quotation
    let quotationMatch = undefined;

    let unexpectedMatch = undefined;

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
            replacementIndexShiftArray[lineIndex].push({ start: replacementKeyMatch.index, endKey: replacementKeyMatch.index + r.key.length, endValue: replacementKeyMatch.index + r.value.length, shift: r.key.length - r.value.length });
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
        let isUnexpected = false;

        switch (curlyBracesType) {
          //in #samples
          case "SAMPLES":
            //curlyBracesBegin({)
            if (match.groups.curlyBracesBegin !== undefined) {
              //inCurlyBraces check
              if (inCurlyBraces) {
                if (unexpectedMatch === undefined) {
                  unexpectedMatch = match;
                }
                isUnexpected = true;
              } else {
                inCurlyBraces = true;
              }
            }

            //curlyBracesEnd(})
            else if (match.groups.curlyBracesEnd !== undefined) {
              if (!inCurlyBraces) {
                if (unexpectedMatch === undefined) {
                  unexpectedMatch = match;
                }
                isUnexpected = true;
              } else {
                inCurlyBraces = false;
                curlyBracesType = "NONE";
              }
            }

            //inCurlyBraces check
            else if (inCurlyBraces) {
              //quotation(")
              if (match.groups.quotation !== undefined) {
                if (quotationMatch === undefined) {
                  quotationMatch = match;
                } else {
                  let sampleName = text.substring(quotationMatch.index + 1, match.index);
                  let sampleDir = samplePath;
                  while (sampleName.match("/")) {
                    sampleDir = sampleDir + "\\" + sampleName.substring(0, sampleName.indexOf("/"));
                    sampleName = sampleName.substring(sampleName.indexOf("/") + 1);
                  }
                  if (!fs.existsSync((vscode.workspace.getConfiguration("mmlamktoolkit").get("AddmusickPath") as string) + "\\samples" + sampleDir) || !fs.readdirSync((vscode.workspace.getConfiguration("mmlamktoolkit").get("AddmusickPath") as string) + "\\samples" + sampleDir).includes(sampleName)) {
                    diagnostics.push(createDiagnosticWithRange(new vscode.Range(lineIndex, getShiftedIndex(lineIndex, (quotationMatch as RegExpExecArray).index), lineIndex, getShiftedIndex(lineIndex, match.index + 1, true)), "Could not find sample " + text.substring(quotationMatch.index + 1, match.index)));
                  }
                  sampleArray.push(text.substring(quotationMatch.index + 1, match.index));
                  quotationMatch = undefined;
                }
              }

              //quotationMatch check
              else if (quotationMatch === undefined) {
                //signSampleGroup(#)
                if (match.groups.signAny !== undefined) {
                  //Through
                }

                //else
                else {
                  if (unexpectedMatch === undefined) {
                    unexpectedMatch = match;
                  }
                  isUnexpected = true;
                }
              }
            }

            //else
            else {
              if (unexpectedMatch === undefined) {
                unexpectedMatch = match;
              }
              isUnexpected = true;
            }
            break;

          //in #instruments
          case "INSTRUMENTS":
            //curlyBracesBegin({)
            if (match.groups.curlyBracesBegin !== undefined) {
              //inCurlyBraces check
              if (inCurlyBraces) {
                if (unexpectedMatch === undefined) {
                  unexpectedMatch = match;
                }
                isUnexpected = true;
              } else {
                inCurlyBraces = true;
              }
            }

            //curlyBracesEnd(})
            else if (match.groups.curlyBracesEnd !== undefined) {
              if (!inCurlyBraces) {
                if (unexpectedMatch === undefined) {
                  unexpectedMatch = match;
                }
                isUnexpected = true;
              } else {
                inCurlyBraces = false;
                curlyBracesType = "NONE";
              }

              if (!isHex && previousMatch?.groups?.curlyBracesBegin === undefined) {
                if (hexMatch === undefined) {
                  diagnostics.push(createDiagnosticWithRange(new vscode.Range(previousLineIndex, getShiftedIndex(previousLineIndex, (previousMatch as RegExpExecArray).index + (previousMatch as RegExpExecArray)[0].length), lineIndex, getShiftedIndex(lineIndex, match.index, true)), "Error parsing instrument definition.\nMust have 5 arguments."));
                } else if (hexCount < 5) {
                  diagnostics.push(createDiagnosticWithRange(new vscode.Range(hexLineIndex, getShiftedIndex(hexLineIndex, (hexMatch as RegExpExecArray).index), lineIndex, getShiftedIndex(lineIndex, match.index, true)), "Error parsing instrument definition.\nMust have 5 arguments."));
                }
                hexCount = 0;
                hexMatch = undefined;
              }
            }

            //inCurlyBraces check
            else if (inCurlyBraces) {
              //quotation(")
              if (match.groups.quotation !== undefined) {
                if (quotationMatch === undefined) {
                  quotationMatch = match;

                  if (!isHex && previousMatch?.groups?.curlyBracesBegin === undefined) {
                    if (hexMatch === undefined) {
                      diagnostics.push(createDiagnosticWithRange(new vscode.Range(previousLineIndex, getShiftedIndex(previousLineIndex, (previousMatch as RegExpExecArray).index + (previousMatch as RegExpExecArray)[0].length), lineIndex, getShiftedIndex(lineIndex, match.index, true)), "Error parsing instrument definition.\nMust have 5 arguments."));
                    } else if (hexCount < 5) {
                      diagnostics.push(createDiagnosticWithRange(new vscode.Range(hexLineIndex, getShiftedIndex(hexLineIndex, (hexMatch as RegExpExecArray).index), lineIndex, getShiftedIndex(lineIndex, match.index, true)), "Error parsing instrument definition.\nMust have 5 arguments."));
                    }
                    hexCount = 0;
                    hexMatch = undefined;
                  }
                } else {
                  if (sampleArray.includes(text.substring(quotationMatch.index + 1, match.index))) {
                    instrumentCount++;
                  } else {
                    diagnostics.push(createDiagnosticWithRange(new vscode.Range(lineIndex, getShiftedIndex(lineIndex, (quotationMatch as RegExpExecArray).index), lineIndex, getShiftedIndex(lineIndex, match.index + 1, true)), "Could not find sample " + text.substring(quotationMatch.index + 1, match.index)));
                  }
                  quotationMatch = undefined;
                }
              }

              //quotationMatch check
              else if (quotationMatch === undefined) {
                //instrument(@)
                if (match.groups.instrument !== undefined) {
                  //Empty check
                  if (match.groups.instrumentValue === "") {
                    diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing the instrument copy portion of the instrument command.\nValue is empty."));
                  }
                  //Range check(0-29)
                  else if (!(0 <= parseInt(match.groups.instrumentValue) && parseInt(match.groups.instrumentValue) <= 29)) {
                    diagnostics.push(createDiagnostic(lineIndex, match, "Cannot use a custom instrument's sample as a base for another custom instrument.\nValid values are 1 to 6."));
                  } else {
                    instrumentCount++;
                  }

                  if (!isHex && previousMatch?.groups?.curlyBracesBegin === undefined) {
                    if (hexMatch === undefined) {
                      diagnostics.push(createDiagnosticWithRange(new vscode.Range(previousLineIndex, getShiftedIndex(previousLineIndex, (previousMatch as RegExpExecArray).index + (previousMatch as RegExpExecArray)[0].length), lineIndex, getShiftedIndex(lineIndex, match.index, true)), "Error parsing instrument definition.\nMust have 5 arguments."));
                    } else if (hexCount < 5) {
                      diagnostics.push(createDiagnosticWithRange(new vscode.Range(hexLineIndex, getShiftedIndex(hexLineIndex, (hexMatch as RegExpExecArray).index), lineIndex, getShiftedIndex(lineIndex, match.index, true)), "Error parsing instrument definition.\nMust have 5 arguments."));
                    }
                    hexCount = 0;
                    hexMatch = undefined;
                  }
                }

                //noise(n)
                else if (match.groups.noise !== undefined) {
                  //Empty check
                  if (match.groups.noiseValue === "") {
                    diagnostics.push(createDiagnostic(lineIndex, match, "Invlid value for the n command.  Value must be in hex and between 0 and 1F.\nValue is empty."));
                  }
                  //Range check(0-1F(31))
                  else if (!(0 <= parseInt("0x" + match.groups.noiseValue, 16) && parseInt("0x" + match.groups.noiseValue, 16) <= 31)) {
                    diagnostics.push(createDiagnostic(lineIndex, match, "Invlid value for the n command.  Value must be in hex and between 0 and 1F.\nValid values are 1 to 1F(31)."));
                  } else {
                    instrumentCount++;
                  }

                  if (!isHex && previousMatch?.groups?.curlyBracesBegin === undefined) {
                    if (hexMatch === undefined) {
                      diagnostics.push(createDiagnosticWithRange(new vscode.Range(previousLineIndex, getShiftedIndex(previousLineIndex, (previousMatch as RegExpExecArray).index + (previousMatch as RegExpExecArray)[0].length), lineIndex, getShiftedIndex(lineIndex, match.index, true)), "Error parsing instrument definition.\nMust have 5 arguments."));
                    } else if (hexCount < 5) {
                      diagnostics.push(createDiagnosticWithRange(new vscode.Range(hexLineIndex, getShiftedIndex(hexLineIndex, (hexMatch as RegExpExecArray).index), lineIndex, getShiftedIndex(lineIndex, match.index, true)), "Error parsing instrument definition.\nMust have 5 arguments."));
                    }
                    hexCount = 0;
                    hexMatch = undefined;
                  }
                }

                //hexCommand($)
                else if (match.groups.hexCommand !== undefined) {
                  //Empty check
                  if (match.groups.hexCommandValue === "") {
                    diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing instrument definition.\nValue is empty."));
                  }
                  //Range check(0-FF(255))
                  else if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 255)) {
                    diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing instrument definition.\nValid values are 1 to FF(255)."));
                  }

                  //Before loading the sample
                  if (previousMatch?.groups?.curlyBracesBegin !== undefined) {
                    diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing instrument definition."));
                  } else if (hexCount < 5) {
                    if (hexCount === 0) {
                      hexLineIndex = lineIndex;
                      hexMatch = match;
                    }
                    hexCount++;
                  } else {
                    diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing instrument definition.\nMust have 5 arguments."));
                  }
                  isHex = true;
                }

                //else
                else {
                  if (unexpectedMatch === undefined) {
                    unexpectedMatch = match;
                  }
                  isUnexpected = true;
                }
              }
            }

            //else
            else {
              if (unexpectedMatch === undefined) {
                unexpectedMatch = match;
              }
              isUnexpected = true;
            }
            break;

          //in #spc
          case "SPC":
            //curlyBracesBegin({)
            if (match.groups.curlyBracesBegin !== undefined) {
              if (inCurlyBraces) {
                if (unexpectedMatch === undefined) {
                  unexpectedMatch = match;
                }
                isUnexpected = true;
              } else {
                inCurlyBraces = true;
              }
            }

            //curlyBracesEnd(})
            else if (match.groups.curlyBracesEnd !== undefined) {
              if (!inCurlyBraces) {
                if (unexpectedMatch === undefined) {
                  unexpectedMatch = match;
                }
                isUnexpected = true;
              } else {
                if (specialMatch !== undefined) {
                  diagnostics.push(createDiagnostic(specialLineIndex, specialMatch, "Unexpected symbol found in SPC info command.  Expected a quoted string."));
                }
                inCurlyBraces = false;
                curlyBracesType = "NONE";
              }
            }

            //inCurlyBraces check
            else if (inCurlyBraces) {
              //quotation(")
              if (match.groups.quotation !== undefined) {
                if (quotationMatch === undefined) {
                  if (specialMatch === undefined) {
                    if (unexpectedMatch === undefined) {
                      unexpectedMatch = match;
                    }
                    isUnexpected = true;
                  }
                  quotationMatch = match;
                } else {
                  if (isSpecialLength) {
                    if (text.substring(quotationMatch.index + 1, match.index).match(/^auto$/) === null) {
                      let lengthMatch = undefined;
                      if ((lengthMatch = text.substring(quotationMatch.index + 1, match.index).match(/^(\d+)\:(\d+)$/)) !== null) {
                        if (parseInt(lengthMatch[1]) * 60 + parseInt(lengthMatch[2]) > 999) {
                          diagnostics.push(createDiagnosticWithRange(new vscode.Range(lineIndex, getShiftedIndex(lineIndex, (quotationMatch as RegExpExecArray).index), lineIndex, getShiftedIndex(lineIndex, match.index + 2, true)), "Songs longer than 16:39 are not allowed by the SPC format."));
                        }
                      } else {
                        diagnostics.push(createDiagnosticWithRange(new vscode.Range(lineIndex, getShiftedIndex(lineIndex, (quotationMatch as RegExpExecArray).index), lineIndex, getShiftedIndex(lineIndex, match.index + 2, true)), 'Error parsing SPC length field. Format must be m:ss or "auto".'));
                      }
                    }
                  }
                  quotationMatch = undefined;
                  specialMatch = undefined;
                  isSpecialLength = false;
                }
              }

              //quotationMatch check
              else if (quotationMatch === undefined) {
                //signInfo(#)
                if (match.groups.signInfo !== undefined) {
                  if (specialMatch !== undefined) {
                    diagnostics.push(createDiagnostic(specialLineIndex, specialMatch, "Unexpected symbol found in SPC info command.  Expected a quoted string."));
                  }
                  specialLineIndex = lineIndex;
                  specialMatch = match;
                  isSpecialLength = false;
                }

                //signLength(#length)
                else if (match.groups.signLength !== undefined) {
                  if (specialMatch !== undefined) {
                    diagnostics.push(createDiagnostic(specialLineIndex, specialMatch, "Unexpected symbol found in SPC info command.  Expected a quoted string."));
                  }
                  specialLineIndex = lineIndex;
                  specialMatch = match;
                  isSpecialLength = true;
                }

                //signAny(#)
                else if (match.groups.signAny !== undefined) {
                  diagnostics.push(createDiagnostic(lineIndex, match, 'Unexpected type name found in SPC info command. Only "author", "comment", "title", "game", and "length" are allowed.'));
                }

                //else
                else {
                  if (unexpectedMatch === undefined) {
                    unexpectedMatch = match;
                  }
                  isUnexpected = true;
                }
              }
            }

            //else
            else {
              if (unexpectedMatch === undefined) {
                unexpectedMatch = match;
              }
              isUnexpected = true;
            }
            break;

          //in otherwise
          case "NONE":
            //replacementBegin("=)
            if (match.groups.replacementBegin !== undefined) {
              if (inReplacement) {
                diagnostics.push(createDiagnostic(lineIndex, match, "Unexpected end of file found.\nNested replacement are not allowed."));
              } else {
                //Empty check
                if (match.groups.replacementBeginValue === "") {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing replacement directive; string to find was of zero length."));
                }
                if (quotationMatch !== undefined) {
                  diagnostics.push(createDiagnostic(lineIndex, quotationMatch, "Unexpected Quotation found."));
                  quotationMatch = undefined;
                }
                inReplacement = true;
                replacementKey = match.groups.replacementBeginValue;
                replacementLineIndex = lineIndex;
                replacementMatch = match;
              }
            }

            //quotation(")
            else if (match.groups.quotation !== undefined) {
              if (inReplacement) {
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

                inSuperLoop = false;
                inLoop = false;
                inCurlyBraces = false;
                hexMatch = undefined;
              } else if (specialMatch !== undefined && quotationMatch === undefined) {
                quotationMatch = match;
              } else if (specialMatch !== undefined && quotationMatch !== undefined) {
                let pathName = text.substring(quotationMatch.index + 1, match.index);
                let pathDir = "";
                while (pathName.match("/")) {
                  pathDir = pathDir + "\\" + pathName.substring(0, pathName.indexOf("/"));
                  pathName = pathName.substring(pathName.indexOf("/") + 1);
                }
                if (!fs.existsSync((vscode.workspace.getConfiguration("mmlamktoolkit").get("AddmusickPath") as string) + "\\samples" + pathDir) || !fs.readdirSync((vscode.workspace.getConfiguration("mmlamktoolkit").get("AddmusickPath") as string) + "\\samples" + pathDir).includes(pathName)) {
                  diagnostics.push(createDiagnosticWithRange(new vscode.Range(lineIndex, getShiftedIndex(lineIndex, (quotationMatch as RegExpExecArray).index), lineIndex, getShiftedIndex(lineIndex, match.index + 1, true)), "Could not find directory " + text.substring(quotationMatch.index + 1, match.index)));
                } else {
                  samplePath = "\\" + text.substring(quotationMatch.index + 1, match.index).replace("/", "\\");
                }
                quotationMatch = undefined;
                specialMatch = undefined;
              } else {
                diagnostics.push(createDiagnostic(lineIndex, match, "Unexpected Quotation found."));
              }
            }

            //quotationMatch check
            else if (quotationMatch === undefined) {
              //signSamples(#samples)
              if (match.groups.signSamples !== undefined) {
                if (inChannel) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Recommended to be defined before the channel."));
                }

                if (inReplacement) {
                  diagnostics.push(createDiagnostic(replacementLineIndex, replacementMatch, "Replacement end cannot be found."));
                  inReplacement = false;
                }

                curlyBracesType = "SAMPLES";
              }

              //signInstruments(#instruments)
              else if (match.groups.signInstruments !== undefined) {
                if (inChannel) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Recommended to be defined before the channel."));
                }

                if (inReplacement) {
                  diagnostics.push(createDiagnostic(replacementLineIndex, replacementMatch, "Replacement end cannot be found."));
                  inReplacement = false;
                }

                curlyBracesType = "INSTRUMENTS";
              }

              //signSpc(#Spc)
              else if (match.groups.signSpc !== undefined) {
                if (inChannel) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Recommended to be defined before the channel."));
                }

                if (inReplacement) {
                  diagnostics.push(createDiagnostic(replacementLineIndex, replacementMatch, "Replacement end cannot be found."));
                  inReplacement = false;
                }

                curlyBracesType = "SPC";
              }

              //signPath(#Path)
              else if (match.groups.signPath !== undefined) {
                if (inChannel) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Recommended to be defined before the channel."));
                }

                if (inReplacement) {
                  diagnostics.push(createDiagnostic(replacementLineIndex, replacementMatch, "Replacement end cannot be found."));
                  inReplacement = false;
                }

                if (specialMatch !== undefined) {
                  diagnostics.push(createDiagnostic(specialLineIndex, specialMatch, "Unexpected symbol found in path command.  Expected a quoted string."));
                }
                specialMatch = match;
                specialLineIndex = lineIndex;
              }

              //signAmk(#amk)
              else if (match.groups.signAmk !== undefined) {
                //Empty check
                if (match.groups.signAmkValue === "") {
                  diagnostics.push(createDiagnostic(lineIndex, match, "#amk must have an integer argument specifying the version.\nValue is empty."));
                }
                //Version check
                else if (parseInt(match.groups.signAmkValue) < 2) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "This song was made for a older version of AddmusicK.\nRecommended to set to #amk 2"));
                } else if (2 < parseInt(match.groups.signAmkValue)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "This song was made for a newer version of AddmusicK. You must update to use this song.\nRecommended to set to #amk 2"));
                } else {
                  existAmk = true;
                }
              }

              //signAm4Amm(#am4,amm)
              else if (match.groups.signAm4Amm !== undefined) {
                diagnostics.push(createDiagnostic(lineIndex, match, "Recommended to set to #amk 2"));
              }

              //signPad(#pad)
              else if (match.groups.signPad !== undefined) {
                //Empty check
                if (match.groups.signPadValue === "") {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing padding directive.\nValue is empty."));
                }
              }

              //signHalvetempo(#halvetempo)
              else if (match.groups.signHalvetempo !== undefined) {
                //
              }

              //signOption(#option)
              else if (match.groups.signOption !== undefined) {
                //Empty check
                if (match.groups.signOptionValue === "") {
                  diagnostics.push(createDiagnostic(lineIndex, match, "#option directive missing its first argument.\nValue is empty."));
                } else if (!match.groups.signOptionValue.match(/^(?:tempoimmunity|dividetempo|smwvtable|noloop)$/i)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "#option directive missing its first argument.\nUnexpected value."));
                }
              }

              //signDefine(#define)
              else if (match.groups.signDefine !== undefined) {
                //Empty check
                if (match.groups.signDefineValue1 === "") {
                  diagnostics.push(createDiagnostic(lineIndex, match, "#define was missing its argument.\nValue is empty."));
                } else {
                  let defineVar = match.groups.signDefineValue1;
                  if (defineArray.find((define) => define.var === defineVar) !== undefined) {
                    if (match.groups.signDefineValueAdditional !== undefined && match.groups.signDefineValue2 !== "") {
                      defineArray.splice(
                        defineArray.findIndex((define) => define.var === defineVar),
                        1,
                        { var: defineVar, value: parseInt(match.groups.signDefineValue2) }
                      );
                    } else {
                      defineArray.splice(
                        defineArray.findIndex((define) => define.var === defineVar),
                        1,
                        { var: defineVar, value: 1 }
                      );
                    }
                  } else {
                    if (match.groups.signDefineValueAdditional !== undefined && match.groups.signDefineValue2 !== "") {
                      defineArray.push({ var: match.groups.signDefineValue1, value: parseInt(match.groups.signDefineValue2) });
                    } else {
                      defineArray.push({ var: match.groups.signDefineValue1, value: 1 });
                    }
                  }
                }
              }

              //signUndef(#undef)
              else if (match.groups.signUndef !== undefined) {
                //Empty check
                if (match.groups.signUndefValue === "") {
                  diagnostics.push(createDiagnostic(lineIndex, match, "#undef was missing its argument.\nValue is empty."));
                } else {
                  let defineVar = match.groups.signUndefValue;
                  defineArray = defineArray.filter((define) => define.var !== defineVar);
                }
              }

              //signIfdef(#ifdef)
              else if (match.groups.signIfdef !== undefined) {
                //Empty check
                if (match.groups.signIfdefValue === "") {
                  diagnostics.push(createDiagnostic(lineIndex, match, "#ifdef was missing its argument.\nValue is empty."));
                }

                defineIfDepth++;
                defineIfMatch = match;
                defineIfLineIndex = lineIndex;
              }

              //signIfndef(#ifndef)
              else if (match.groups.signIfndef !== undefined) {
                //Empty check
                if (match.groups.signIfndefValue === "") {
                  diagnostics.push(createDiagnostic(lineIndex, match, "#ifndef was missing its argument.\nValue is empty."));
                }

                defineIfDepth++;
                defineIfMatch = match;
                defineIfLineIndex = lineIndex;
              }

              //signIf(#if)
              else if (match.groups.signIf !== undefined) {
                //Value1
                //Empty check
                if (match.groups.signIfValue1 === "") {
                  diagnostics.push(createDiagnostic(lineIndex, match, "First argument for #if was never defined.\nValue1 is empty."));
                } else {
                  let defineVar = match.groups.signIfValue1;
                  if (defineArray.find((define) => define.var === defineVar) === undefined) {
                    diagnostics.push(createDiagnostic(lineIndex, match, "First argument for #if was never defined."));
                  }
                }

                //Value2
                //Empty check
                if (match.groups.signIfValue2 === "") {
                  diagnostics.push(createDiagnostic(lineIndex, match, "#if was missing its second argument.\nValue2 is empty."));
                } else if (!match.groups.signIfValue2.match(/^(?:\=\=|\<|\>|\<\=|\>\=|\!\=)$/)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Unknown operator for #if."));
                }

                //Value3
                //Empty check
                if (match.groups.signIfValue3 === "") {
                  diagnostics.push(createDiagnostic(lineIndex, match, "#if was missing its second argument.\nValue3 is empty."));
                }

                defineIfDepth++;
                defineIfMatch = match;
                defineIfLineIndex = lineIndex;
              }

              //signEndif(#endif)
              else if (match.groups.signEndif !== undefined) {
                if (defineIfDepth <= 0) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "There was an #endif without a matching #ifdef, #ifndef, or #if."));
                } else {
                  defineIfDepth--;
                }
              }

              //signError(#error)
              else if (match.groups.signError !== undefined) {
                if (defineIfDepth <= 0) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "You'll want to use this with #ifs, #ifdefs, etc."));
                }
              }

              //channel(#)
              else if (match.groups.channel !== undefined) {
                //Range check(0-7)
                if (match.groups.channelValue !== undefined && !(0 <= parseInt(match.groups.channelValue) && parseInt(match.groups.channelValue) <= 7)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing channel directive.\nValid values are 0 to 7."));
                } else {
                  inChannel = true;
                }

                if (inSuperLoop) {
                  diagnostics.push(createDiagnostic(superLoopLineIndex, superLoopMatch, "A subloop end cannot be found."));
                }
                inSuperLoop = false;

                if (inLoop) {
                  diagnostics.push(createDiagnostic(loopLineIndex, loopMatch, "Loop end cannot be found."));
                }
                inLoop = false;

                if (inReplacement) {
                  diagnostics.push(createDiagnostic(replacementLineIndex, replacementMatch, "Replacement end cannot be found."));
                  inReplacement = false;
                }

                //Reset values
                pitch = 0;
                tune = 0;
              }

              //signAny(#)
              else if (match.groups.signAny !== undefined) {
                diagnostics.push(createDiagnostic(lineIndex, match, "Unexpected special command found."));
              }

              //sampleLoad(("",$))
              else if (match.groups.sampleLoad !== undefined) {
                //Value1
                if (!sampleArray.includes(match.groups.sampleLoadValue1)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Could not find sample " + match.groups.sampleLoadBeginValue));
                }

                //Value2
                //Empty check
                if (match.groups.sampleLoadValue2 === "") {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing sample load command.\nValue is empty."));
                }
                //Range check(0-FF(255))
                else if (!(0 <= parseInt("0x" + match.groups.sampleLoadValue2, 16) && parseInt("0x" + match.groups.sampleLoadValue2, 16) <= 255)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing sample load command.\nValid values are 0 to FF(255)."));
                }
              }

              //illegalLoopBegin([[[)
              else if (match.groups.illegalLoopBegin !== undefined) {
                diagnostics.push(createDiagnostic(lineIndex, match, 'An ambiguous use of the [ and [[ loop delimiters was found ("[[["). Separate the "[[" and "[" to clarify your intention.'));
              }

              //remoteCodeDefBegin((!)[)
              else if (match.groups.remoteCodeDefBegin !== undefined) {
                if (inChannel) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing code setup.\nMust be outside a channel."));
                } else if (inLoop) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "You cannot nest standard [ ] loops."));
                } else {
                  inLoop = true;
                  loopLineIndex = lineIndex;
                  loopMatch = match;
                }

                //Empty check
                if (match.groups.remoteCodeDefBeginValue === "") {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing remote code definition.\nValue is empty."));
                }
                //Range check(0-65535)
                else if (!(0 <= parseInt(match.groups.remoteCodeDefBeginValue) && parseInt(match.groups.remoteCodeDefBeginValue) <= 65535)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Label redefinition.\nValid values are 0 to 65535."));
                } else if (remoteCodeArray.includes(parseInt(match.groups.remoteCodeDefBeginValue))) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Label redefinition."));
                } else {
                  remoteCodeArray.push(parseInt(match.groups.remoteCodeDefBeginValue));
                }
              }

              //remoteCodeCall((!,))
              else if (match.groups.remoteCodeCall !== undefined) {
                if (!inChannel && !inReplacement) {
                  //inLoop check
                  if (inLoop) {
                    diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing remote code definition.\nCannot call in remote code definition."));
                  } else {
                    diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing remote code definition.\nMust be inside a channel or replacement."));
                  }
                }

                //Value1
                //Empty check
                if (match.groups.remoteCodeCallValue1 === "") {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing remote code setup.\nValue is empty."));
                }
                //Range check(0-65535)
                else if (!(0 <= parseInt(match.groups.remoteCodeCallValue1) && parseInt(match.groups.remoteCodeCallValue1) <= 65535)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing remote code setup.\nValid values are 0 to 65535."));
                } else if (!remoteCodeArray.includes(parseInt(match.groups.remoteCodeCallValue1)) && !inReplacement) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing remote code setup.\nLabel not yet defined."));
                }

                //Value2
                //Empty check
                if (match.groups.remoteCodeCallValue2 === "") {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing remote code setup.\nValue is empty."));
                }
                //Range check(-1-4)
                else if (!(-1 <= parseInt(match.groups.remoteCodeCallValue2) && parseInt(match.groups.remoteCodeCallValue2) <= 4)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing remote code setup.\nValid values are -1 to 4."));
                }

                //Value3
                //Value2, Empty check
                if (parseInt(match.groups.remoteCodeCallValue2) === 1 || parseInt(match.groups.remoteCodeCallValue2) === 2) {
                  if (match.groups.remoteCodeCallValue3 === undefined) {
                    diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing remote code setup.\nNeed argument3."));
                  } else if (match.groups.remoteCodeCallValue3 === "") {
                    diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing remote code setup.\nValue is empty."));
                  }
                } else if (!(parseInt(match.groups.remoteCodeCallValue2) === 1 || parseInt(match.groups.remoteCodeCallValue2) === 2) && match.groups.remoteCodeCallValue3 !== undefined) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing remote code setup.\nDo not need argument3."));
                }
              }

              //superLoopBegin([[)
              else if (match.groups.superLoopBegin !== undefined) {
                if (inSuperLoop) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "You cannot nest a subloop within another subloop."));
                } else {
                  inSuperLoop = true;
                  superLoopLineIndex = lineIndex;
                  superLoopMatch = match;
                }
              }

              //labelLoopBegin(()[)
              else if (match.groups.labelLoopBegin !== undefined) {
                if (inLoop) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Nested loops are not allowed."));
                } else {
                  inLoop = true;
                  loopLineIndex = lineIndex;
                  loopMatch = match;
                }

                //Empty check
                if (match.groups.labelLoopBeginValue === "") {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing label loop.\nValue is empty."));
                }
                //Range check(0-65534)
                else if (!(0 <= parseInt(match.groups.labelLoopBeginValue) && parseInt(match.groups.labelLoopBeginValue) <= 65534)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Illegal value for loop label.\nValid values are 0 to 65534."));
                } else if (labelLoopArray.includes(parseInt(match.groups.labelLoopBeginValue))) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Label redefinition."));
                } else {
                  labelLoopArray.push(parseInt(match.groups.labelLoopBeginValue));
                }
              }

              //labelLoopCall(())
              else if (match.groups.labelLoopCall !== undefined) {
                if (inLoop) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Nested loops are not allowed."));
                }

                //Value1
                //Empty check
                if (match.groups.labelLoopCallValue1 === "") {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing label loop.\nValue is empty."));
                }
                //Range check(0-65534)
                else if (!(0 <= parseInt(match.groups.labelLoopCallValue1) && parseInt(match.groups.labelLoopCallValue1) <= 65534)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Illegal value for loop label.\nValid values are 0 to 65534."));
                } else if (!labelLoopArray.includes(parseInt(match.groups.labelLoopCallValue1))) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Label not yet defined."));
                }

                //Value2
                //Range check(0-255)
                if (match.groups.labelLoopCallValue2 !== "" && !(0 <= parseInt(match.groups.labelLoopCallValue2) && parseInt(match.groups.labelLoopCallValue2) <= 255)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Invalid loop count.\nValid values are 0 to 255."));
                }
              }

              //loopBegin([)
              else if (match.groups.loopBegin !== undefined) {
                if (inLoop) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "You cannot nest standard [ ] loops."));
                } else {
                  inLoop = true;
                  loopLineIndex = lineIndex;
                  loopMatch = match;
                }
              }

              //illegalLoopEnd(]]])
              else if (match.groups.illegalLoopEnd !== undefined) {
                diagnostics.push(createDiagnostic(lineIndex, match, 'An ambiguous use of the ] and ]] loop delimiters was found ("]]]"). Separate the "]]" and "]" to clarify your intention.'));
              }

              //superLoopEnd(]])
              else if (match.groups.superLoopEnd !== undefined) {
                if (!inReplacement && !inSuperLoop) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "A subloop end was found outside of a subloop."));
                }
                inSuperLoop = false;

                if (!inReplacement) {
                  //Empty check
                  if (match.groups.superLoopEndValue === "") {
                    diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing subloop command; the loop count was missing."));
                  }
                  //Range check(2-)
                  if (!(2 <= parseInt(match.groups.superLoopEndValue))) {
                    diagnostics.push(createDiagnostic(lineIndex, match, "A subloop cannot only repeat once. It's pointless anyway."));
                  }
                }
              }

              //loopEnd(])
              else if (match.groups.loopEnd !== undefined) {
                if (!inReplacement && !inLoop) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Loop end found outside of a loop."));
                }
                inLoop = false;

                //Range check(0-255)
                if (match.groups.loopEndValue !== "" && !(0 <= parseInt(match.groups.loopEndValue) && parseInt(match.groups.loopEndValue) <= 255)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Invalid loop count.\nValid values are 0 to 255."));
                }
              }

              //loopRecall(*)
              else if (match.groups.loopRecall !== undefined) {
                if (inLoop) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Nested loops are not allowed."));
                } else if (loopMatch === undefined) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Previous loop not found."));
                }

                //Range check(0-255)
                if (match.groups.loopRecallValue !== "" && !(0 <= parseInt(match.groups.loopRecallValue) && parseInt(match.groups.loopRecallValue) <= 255)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Invalid loop count.\nValid values are 0 to 255."));
                }
              }

              //curlyBracesBegin({)
              else if (match.groups.curlyBracesBegin !== undefined) {
                if (inCurlyBraces) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Triplet on directive found within a triplet block."));
                } else {
                  inCurlyBraces = true;
                }
              }

              //curlyBracesEnd(})
              else if (match.groups.curlyBracesEnd !== undefined) {
                if (!inReplacement && !inCurlyBraces) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Triplet off directive found outside of a triplet block."));
                }
                inCurlyBraces = false;
              }

              //hexCommand($)
              else if (match.groups.hexCommand !== undefined) {
                //Empty check
                if (!inReplacement && match.groups.hexCommandValue === "") {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing hex command.\nValue is empty."));
                } else {
                  isHex = true;

                  if (hexMatch === undefined) {
                    hexLineIndex = lineIndex;
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
                      //Global volume
                      case "E0":
                      //Tempo
                      case "E2":
                      //Global transpose
                      case "E4":
                      //Volume
                      case "E7":
                      //Vibrato fade
                      case "EA":
                      //Tune channel
                      case "EE":
                      //Enable noise
                      case "F8":
                        if (hexCount >= 1) {
                          //Range check(0-FF(255))
                          if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 255)) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing hex command.\nValid values are 0 to FF(255)."));
                          }
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //2 arguments(FF)
                      //Global volume fade
                      case "E1":
                      //Tempo fade
                      case "E3":
                      //Volume fade
                      case "E8":
                      //Sample load
                      case "F3":
                      //Data send
                      case "F9":
                      //DSP write
                      case "F6":
                        if (hexCount >= 1) {
                          //Range check(0-FF(255))
                          if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 255)) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing hex command.\nValid values are 0 to FF(255)."));
                          }
                          if (hexCount >= 2) {
                            hexMatch = undefined;
                          }
                        }
                        hexCount++;
                        break;

                      //3 arguments(FF)
                      //Vibrato
                      case "DE":
                      //Tremolo
                      case "E5":
                      //Pitch envelope (release)
                      case "EB":
                      //Pitch envelope (attack)
                      case "EC":
                      //Echo 1
                      case "EF":
                      //Echo fade
                      case "F2":
                        if (hexCount >= 1) {
                          //Range check(0-FF(255))
                          if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 255)) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing hex command.\nValid values are 0 to FF(255)."));
                          }
                          if (hexCount >= 3) {
                            hexMatch = undefined;
                          }
                        }
                        hexCount++;
                        break;

                      //Instrument
                      case "DA":
                        if (hexCount >= 1) {
                          //Range check(0-12(18))
                          if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 18)) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Default limit is $00 to $12."));
                          }
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Pan
                      case "DB":
                        if (hexCount >= 1) {
                          //Range check(0-13(19))
                          if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 19)) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Must be between $00 and $13."));
                          }
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Pan fade
                      case "DC":
                        if (hexCount === 1) {
                          //Range check(0-FF(255))
                          if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 255)) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing hex command.\nValid values are 0 to FF(255)."));
                          }
                        } else if (hexCount >= 2) {
                          //Range check(0-13(19))
                          if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 19)) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Must be between $00 and $13."));
                          }
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Pitch bend
                      case "DD":
                        if (hexCount === 1 || hexCount === 2) {
                          //Range check(0-FF(255))
                          if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 255)) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing hex command.\nValid values are 0 to FF(255)."));
                          }
                        } else if (hexCount >= 3) {
                          //Range check(80(128)-C5(197))
                          if (!inReplacement && !(128 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 197)) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Recommended values are 128(80) to C5(197)."));
                          }
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Subloop
                      case "E6":
                        if (hexCount >= 1) {
                          //Subloop start
                          if (0 === parseInt("0x" + match.groups.hexCommandValue, 16)) {
                            if (inSuperLoop) {
                              diagnostics.push(createDiagnostic(lineIndex, match, "Cannot nest $E6 loops within other $E6 loops."));
                            } else {
                              inSuperLoop = true;
                              superLoopLineIndex = lineIndex;
                              superLoopMatch = match;
                            }
                          }
                          //Subloop end
                          else {
                            if (!inReplacement && !inSuperLoop) {
                              diagnostics.push(createDiagnostic(lineIndex, match, "An E6 loop starting point has not yet been declared."));
                            }
                            inSuperLoop = false;
                          }
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Loop
                      case "E9":
                        diagnostics.push(createDiagnostic(lineIndex, match, "Do not use manually hex loop command."));
                        break;

                      //ADSR,GAIN
                      case "ED":
                        if (hexCount === 1) {
                          //Range check(0-80(128))
                          if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 128)) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing hex command.\nValid values are 0 to 80(128)."));
                          }
                        } else if (hexCount >= 2) {
                          //Range check(0-FF(255))
                          if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 255)) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing hex command.\nValid values are 0 to FF(255)."));
                          }
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Echo 2
                      case "F1":
                        if (hexCount === 1) {
                          //Range check(0-0F(15))
                          if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 15)) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing hex command.\nValid values are 0 to 0F(15)."));
                          }
                        } else if (hexCount === 2) {
                          //Range check(0-FF(255))
                          if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 255)) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing hex command.\nValid values are 0 to FF(255)."));
                          }
                        } else if (hexCount >= 3) {
                          //Range check(0-01(1))
                          if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 1)) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Recommended values are 00(0) to 01(1)."));
                          }
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Misc 1
                      case "F4":
                        if (hexCount >= 1) {
                          //Range check(0-09(9))
                          if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 9) || parseInt("0x" + match.groups.hexCommandValue, 16) === 4) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing hex command.\nUndefined command."));
                          }
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //FIR filter
                      case "F5":
                        if (hexCount >= 1) {
                          //Range check(0-FF(255))
                          if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 255)) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing hex command.\nValid values are 0 to FF(255)."));
                          }
                          if (hexCount >= 8) {
                            hexMatch = undefined;
                          }
                        }
                        hexCount++;
                        break;

                      //Misc 2
                      case "FA":
                        if (hexCount === 1) {
                          //Range check(0-04(4))
                          if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 4)) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing hex command.\nUndefined command."));
                          }
                        } else if (hexCount >= 2) {
                          //Range check(0-FF(255))
                          if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 255)) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing hex command.\nValid values are 0 to FF(255)."));
                          }
                          hexMatch = undefined;
                        }
                        hexCount++;
                        break;

                      //Misc 3
                      case "FB":
                        if (hexCount === 1) {
                          //Range check(0-81(129))
                          if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 129)) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing hex command.\nUndefined command."));
                          }
                          arpeggioCount = parseInt("0x" + match.groups.hexCommandValue, 16);
                        } else if (hexCount >= 2) {
                          //Range check(0-FF(255))
                          if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 255)) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing hex command.\nValid values are 0 to FF(255)."));
                          }

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
                        if (hexCount >= 1) {
                          //Range check(0-FF(255))
                          if (!(0 <= parseInt("0x" + match.groups.hexCommandValue, 16) && parseInt("0x" + match.groups.hexCommandValue, 16) <= 255)) {
                            diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing hex command.\nValid values are 0 to FF(255)."));
                          }
                          if (hexCount >= 4) {
                            hexMatch = undefined;
                          }
                        }
                        hexCount++;
                        break;
                    }
                  }
                }
              }

              //quantization(q)
              else if (match.groups.quantization !== undefined) {
                //Empty check
                if (match.groups.quantizationValue === "") {
                  if (!inReplacement) {
                    diagnostics.push(createDiagnostic(lineIndex, match, 'Error parsing quantization ("q") command.\nValue is empty.'));
                  }
                }
                //Range check(0-7F(127))
                else if (!(0 <= parseInt("0x" + match.groups.quantizationValue, 16) && parseInt("0x" + match.groups.quantizationValue, 16) <= 127)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, 'Error parsing quantization ("q") command.\nValid values are 1 to 7F(127).'));
                }
                //Length check(2~)
                else if (match.groups.quantizationValue.length < 2) {
                  if (!inReplacement) {
                    diagnostics.push(createDiagnostic(lineIndex, match, 'Error parsing quantization ("q") command.\nValid values are 2 digits.'));
                  }
                }
              }

              //noise(n)
              else if (match.groups.noise !== undefined) {
                //Empty check
                if (match.groups.noiseValue === "") {
                  if (!inReplacement) {
                    diagnostics.push(createDiagnostic(lineIndex, match, "Invlid value for the n command.  Value must be in hex and between 0 and 1F.\nValue is empty."));
                  }
                }
                //Range check(0-1F(31))
                else if (!(0 <= parseInt("0x" + match.groups.noiseValue, 16) && parseInt("0x" + match.groups.noiseValue, 16) <= 31)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Invlid value for the n command.  Value must be in hex and between 0 and 1F.\nValid values are 1 to 1F(31)."));
                }
              }

              //note(a-g)
              else if (match.groups.note !== undefined) {
                pitch = noteToPitch(match.groups.notePitch.toLowerCase());

                if (!inChannel && !inReplacement) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Note data must be inside a channel!"));
                }

                //Format check
                if (match.groups.noteLength.match(/^\d*\.*$/) === null && match.groups.noteLength.match(/^=\d+$/) === null) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing note.\nInvalid format of note."));
                }

                //Pitch check
                if (pitch + octave * 12 + tune < 12) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Note's pitch was too low."));
                } else if (82 < pitch + octave * 12 + tune) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Note's pitch was too high."));
                }

                if (hexMatch !== undefined && hexMatch[0] === "$DD" && hexCount === 3) {
                  hexMatch = undefined;
                }

                function noteToPitch(note: string): number {
                  switch (note) {
                    case "c-":
                      return 11;

                    case "c":
                      return 0;

                    case "c+":
                      return 1;

                    case "d-":
                      return 1;

                    case "d":
                      return 2;

                    case "d+":
                      return 3;

                    case "e-":
                      return 3;

                    case "e":
                      return 4;

                    case "e+":
                      return 5;

                    case "f-":
                      return 4;

                    case "f":
                      return 5;

                    case "f+":
                      return 6;

                    case "g-":
                      return 6;

                    case "g":
                      return 7;

                    case "g+":
                      return 8;

                    case "a-":
                      return 8;

                    case "a":
                      return 9;

                    case "a+":
                      return 10;

                    case "b-":
                      return 10;

                    case "b":
                      return 11;

                    case "b+":
                      return 0;

                    default:
                      return NaN;
                  }
                }
              }

              //rest(r)
              else if (match.groups.rest !== undefined) {
                if (!inChannel && !inReplacement) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Note data must be inside a channel!"));
                }

                //Format check
                if (match.groups.restLength.match(/^\d*\.*$/) === null && match.groups.restLength.match(/^=\d+$/) === null) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing note.\nInvalid format of rest."));
                }
              }

              //tie(^)
              else if (match.groups.tie !== undefined) {
                if (!inChannel && !inReplacement) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Note data must be inside a channel!"));
                }

                //Format check
                if (match.groups.tieLength.match(/^\d*\.*$/) === null && match.groups.tieLength.match(/^=\d+$/) === null) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing note.\nInvalid format of tie."));
                }

                //Pitch check
                if (pitch + octave * 12 + tune < 12) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Note's pitch was too low."));
                } else if (82 < pitch + octave * 12 + tune) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Note's pitch was too high."));
                }
              }

              //tune(h)
              else if (match.groups.tune !== undefined) {
                //Empty check
                if (match.groups.tuneValue === "") {
                  if (!inReplacement) {
                    diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing h transpose directive.\nValue is empty."));
                  }
                } else {
                  tune = parseInt(match.groups.tuneValue);
                }
              }

              //octave(o)
              else if (match.groups.octave !== undefined) {
                //Empty check
                if (match.groups.octaveValue === "") {
                  if (!inReplacement) {
                    diagnostics.push(createDiagnostic(lineIndex, match, 'Error parsing octave ("o") directive.\nValue is empty.'));
                  }
                }
                //Range check(1-6)
                else if (!(1 <= parseInt(match.groups.octaveValue) && parseInt(match.groups.octaveValue) <= 6)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, 'Error parsing octave ("o") directive.\nValid values are 1 to 6.'));
                } else {
                  octave = parseInt(match.groups.octaveValue);
                }
              }

              //defaultLength(l)
              else if (match.groups.defaultLength !== undefined) {
                //Empty check
                if (match.groups.defaultLengthLength === "") {
                  if (!inReplacement) {
                    diagnostics.push(createDiagnostic(lineIndex, match, 'Error parsing "l" directive.\nValue is empty.'));
                  }
                }
                //Range check(1-255)
                else if (!(0 <= parseInt(match.groups.defaultLengthLength) && parseInt(match.groups.defaultLengthLength) <= 255)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, 'Error parsing "l" directive.\nValid values are 1 to 255.'));
                }
              }

              //instrument(@)
              else if (match.groups.instrument !== undefined) {
                //Empty check
                if (match.groups.instrumentValue === "") {
                  if (!inReplacement) {
                    diagnostics.push(createDiagnostic(lineIndex, match, 'Error parsing instrument ("@") command.\nValue is empty.'));
                  }
                }
                //Range check(0-29~)
                else if (!(0 <= parseInt(match.groups.instrumentValue) && parseInt(match.groups.instrumentValue) <= 29 + instrumentCount)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "This custom instrument has not been defined yet.\nValid values are 0 to " + (29 + instrumentCount) + "."));
                }
              }

              //volume(v)
              else if (match.groups.volume !== undefined) {
                //Empty check
                if (match.groups.volumeValue === "") {
                  if (!inReplacement) {
                    diagnostics.push(createDiagnostic(lineIndex, match, 'Error parsing volume ("v") command.\nValue is empty.'));
                  }
                }
                //Range check(0-255)
                else if (!(0 <= parseInt(match.groups.volumeValue) && parseInt(match.groups.volumeValue) <= 255)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, 'Illegal value for volume ("v") command.\nValid values are 0 to 255.'));
                }
              }

              //globalVolume(w)
              else if (match.groups.globalVolume !== undefined) {
                //Empty check
                if (match.groups.globalVolumeValue === "") {
                  if (!inReplacement) {
                    diagnostics.push(createDiagnostic(lineIndex, match, 'Error parsing global volume ("w") command.\nValue is empty.'));
                  }
                }
                //Range check(0-255)
                else if (!(0 <= parseInt(match.groups.globalVolumeValue) && parseInt(match.groups.globalVolumeValue) <= 255)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, 'Illegal value for global volume ("w") command.\nValid values are 0 to 255.'));
                }
              }

              //pan(y)
              else if (match.groups.pan !== undefined) {
                //Value1
                //Empty check
                if (match.groups.panValue1 === "") {
                  if (!inReplacement) {
                    diagnostics.push(createDiagnostic(lineIndex, match, 'Error parsing pan ("y") command.\nValue is empty.'));
                  }
                }
                //Range check(0-20)
                else if (!(0 <= parseInt(match.groups.panValue1) && parseInt(match.groups.panValue1) <= 20)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, 'Illegal value for pan ("y") command.\nValid values are 0 to 20.'));
                }

                if (match.groups.panValueAdditional !== undefined) {
                  //Value2
                  //Empty check
                  if (match.groups.panValue2 === "") {
                    if (!inReplacement) {
                      diagnostics.push(createDiagnostic(lineIndex, match, 'Error parsing pan ("y") command.\nArgument2 is empty.'));
                    }
                  }
                  //Range check(0-2)
                  else if (!(0 <= parseInt(match.groups.panValue2) && parseInt(match.groups.panValue2) <= 2)) {
                    diagnostics.push(createDiagnostic(lineIndex, match, 'Illegal value for pan ("y") command.\nValid values for argument2 are 0 to 2.'));
                  }

                  //Value3
                  //Empty check
                  if (match.groups.panValue3 === "") {
                    if (!inReplacement) {
                      diagnostics.push(createDiagnostic(lineIndex, match, 'Error parsing pan ("y") command.\nArgument3 is empty.'));
                    }
                  }
                  //Range check(0-2)
                  else if (!(0 <= parseInt(match.groups.panValue3) && parseInt(match.groups.panValue3) <= 2)) {
                    diagnostics.push(createDiagnostic(lineIndex, match, 'Illegal value for pan ("y") command.\nValid values for argument3 are 0 to 2.'));
                  }
                }
              }

              //tempo(t)
              else if (match.groups.tempo !== undefined) {
                //Empty check
                if (match.groups.tempoValue === "") {
                  if (!inReplacement) {
                    diagnostics.push(createDiagnostic(lineIndex, match, 'Error parsing tempo ("t") command.\nValue is empty.'));
                  }
                }
                //Range check(0-255)
                else if (!(0 <= parseInt(match.groups.tempoValue) && parseInt(match.groups.tempoValue) <= 255)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, 'Illegal value for tempo ("t") command.\nValid values are 0 to 255.'));
                }
              }

              //vibrato(p)
              else if (match.groups.vibrato !== undefined) {
                //Value1
                //Empty check
                if (match.groups.vibratoValue1 === "") {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing vibrato command.\nArgument1 is empty."));
                }
                //Range check(0-255)
                else if (!(0 <= parseInt(match.groups.vibratoValue1) && parseInt(match.groups.vibratoValue1) <= 255)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Illegal value for vibrato " + (match.groups.vibratoValueAdditional === undefined ? "rate" : "delay") + ".\nValid values for argument1 are 0 to 255."));
                }

                //Value2
                //Empty check
                if (match.groups.vibratoValue2 === "") {
                  if (!inReplacement) {
                    diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing vibrato command.\nArgument2 is empty."));
                  }
                }
                //Range check(0-255)
                else if (!(0 <= parseInt(match.groups.vibratoValue2) && parseInt(match.groups.vibratoValue2) <= 255)) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Illegal value for vibrato " + (match.groups.vibratoValueAdditional === undefined ? "extent" : "rate") + ".\nValid values for argument2 are 0 to 255."));
                }

                if (match.groups.vibratoValueAdditional !== undefined) {
                  //Value3
                  //Empty check
                  if (match.groups.vibratoValue3 === "") {
                    if (!inReplacement) {
                      diagnostics.push(createDiagnostic(lineIndex, match, "Error parsing vibrato command.\nArgument3 is empty."));
                    }
                  }
                  //Range check(0-255)
                  else if (!(0 <= parseInt(match.groups.vibratoValue3) && parseInt(match.groups.vibratoValue3) <= 255)) {
                    diagnostics.push(createDiagnostic(lineIndex, match, "Illegal value for vibrato extent.\nValid values for argument3 are 0 to 255."));
                  }
                }
              }

              //octaveLower(<)
              else if (match.groups.octaveLower !== undefined) {
                octave--;

                //octave check
                if (octave < 1) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "The octave has been dropped too low."));
                } else if (6 < octave) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "The octave has been raised too high."));
                }

                if (hexMatch !== undefined && hexMatch[0] === "$DD" && hexCount === 3) {
                  isHex = true;
                }
              }

              //octaveRaise(>)
              else if (match.groups.octaveRaise !== undefined) {
                octave++;

                //octave check
                if (octave < 1) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "The octave has been dropped too low."));
                } else if (6 < octave) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "The octave has been raised too high."));
                }

                if (hexMatch !== undefined && hexMatch[0] === "$DD" && hexCount === 3) {
                  isHex = true;
                }
              }

              //loopPoint(/)
              else if (match.groups.loopPoint !== undefined) {
                //inLoop,inSuperLoop check
                if (inLoop || inSuperLoop) {
                  diagnostics.push(createDiagnostic(lineIndex, match, "Intro directive found within a loop."));
                }
              }

              //else
              else {
                if (!inReplacement && unexpectedMatch === undefined) {
                  unexpectedMatch = match;
                }
                isUnexpected = true;
              }
            }

            break;
        }

        if (!isHex && hexMatch !== undefined) {
          if (!inReplacement) {
            diagnostics.push(createDiagnosticWithRange(new vscode.Range(hexLineIndex, getShiftedIndex(hexLineIndex, (hexMatch as RegExpExecArray).index), previousLineIndex, getShiftedIndex(previousLineIndex, (previousMatch as RegExpExecArray).index + (previousMatch as RegExpExecArray)[0].length, true)), "Invalid hex command"));
          }
          hexMatch = undefined;
        }

        if (!isUnexpected && unexpectedMatch !== undefined) {
          diagnostics.push(createDiagnosticWithRange(new vscode.Range(lineIndex, getShiftedIndex(lineIndex, (unexpectedMatch as RegExpExecArray).index), lineIndex, getShiftedIndex(lineIndex, match.index, true)), getUnexpectedErrorText()));
          unexpectedMatch = undefined;
        }

        previousLineIndex = lineIndex;
        previousMatch = match;
      }
    }

    if (quotationMatch !== undefined) {
      diagnostics.push(createDiagnosticWithRange(new vscode.Range(lineIndex, getShiftedIndex(lineIndex, (quotationMatch as RegExpExecArray).index), lineIndex, getShiftedIndex(lineIndex, text.length, true)), "Unexpected end of file found."));
    }

    if (inReplacement) {
      if (lineIndex === replacementLineIndex) {
        replacementValue = text.substring((replacementMatch as RegExpExecArray).index + (replacementMatch as RegExpExecArray)[0].length);
      } else {
        replacementValue += " " + text;
      }
    }

    if (unexpectedMatch !== undefined) {
      diagnostics.push(createDiagnosticWithRange(new vscode.Range(lineIndex, getShiftedIndex(lineIndex, (unexpectedMatch as RegExpExecArray).index), lineIndex, getShiftedIndex(lineIndex, text.length, true)), getUnexpectedErrorText()));
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
              regexMap.signAm4Amm,
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

    /**
     * Get error text from CurlyBracesType
     * @param curlyBracesType
     * @returns
     */
    function getUnexpectedErrorText(): string {
      switch (curlyBracesType) {
        case "SAMPLES":
          return "Unexpected character found in sample group definition.";
        case "INSTRUMENTS":
          return "Error parsing instrument definition.";
        case "SPC":
          return "Unexpected symbol found in SPC info command.";
        default:
          return "Unexpected character found.";
      }
    }
  }

  if (!existAmk) {
    diagnostics.push(createDiagnosticWithRange(new vscode.Range(0, 0, doc.lineCount - 1, getShiftedIndex(doc.lineCount - 1, doc.lineAt(doc.lineCount - 1).text.length, true)), "Song did not specify target program with #amk, #am4, or #amm."));
  }

  if (0 < defineIfDepth) {
    diagnostics.push(createDiagnostic(defineIfLineIndex, defineIfMatch, "There was an #ifdef, #ifndef, or #if without a matching #endif."));
  }

  if (inSuperLoop) {
    diagnostics.push(createDiagnostic(superLoopLineIndex, superLoopMatch, "A subloop end cannot be found."));
  }

  if (inLoop) {
    diagnostics.push(createDiagnostic(loopLineIndex, loopMatch, "Loop end cannot be found."));
  }

  if (inReplacement) {
    diagnostics.push(createDiagnostic(replacementLineIndex, replacementMatch, "Replacement end cannot be found."));
  }

  mmlDiagnostics.set(doc.uri, diagnostics);

  function getShiftedRange(lineIndex: number, match: any): vscode.Range {
    let shift = 0;
    for (const replacementIndexShift of replacementIndexShiftArray[lineIndex]) {
      //pre replacement
      if (match.index < replacementIndexShift.start) {
        return new vscode.Range(lineIndex, match.index + shift, lineIndex, match.index + shift + match[0].length);
      }
      //in replacement
      else if (match.index < replacementIndexShift.endValue) {
        return new vscode.Range(lineIndex, replacementIndexShift.start + shift, lineIndex, replacementIndexShift.endKey + shift);
      }
      //post replacement
      else {
        shift += replacementIndexShift.shift;
      }
    }
    return new vscode.Range(lineIndex, match.index + shift, lineIndex, match.index + shift + match[0].length);
  }

  function getShiftedIndex(lineIndex: number, index: number, isEnd?: boolean): number {
    let shift = 0;
    for (const replacementIndexShift of replacementIndexShiftArray[lineIndex]) {
      //pre replacement
      if (index < replacementIndexShift.start) {
        return index + shift;
      }
      //in replacement
      else if (index < replacementIndexShift.endValue) {
        return (isEnd ? replacementIndexShift.endKey : replacementIndexShift.start) + shift;
      }
      //post replacement
      else {
        shift += replacementIndexShift.shift;
      }
    }
    return index + shift;
  }

  function createDiagnostic(lineIndex: number, match: any, errorText: string): vscode.Diagnostic {
    const range = getShiftedRange(lineIndex, match);
    const diagnostic = new vscode.Diagnostic(range, errorText, vscode.DiagnosticSeverity.Information);
    diagnostic.code = "mml";
    return diagnostic;
  }

  function createDiagnosticWithRange(range: vscode.Range, errorText: string): vscode.Diagnostic {
    const diagnostic = new vscode.Diagnostic(range, errorText, vscode.DiagnosticSeverity.Information);
    diagnostic.code = "mml";
    return diagnostic;
  }
}

export function subscribeToDocumentChanges(context: vscode.ExtensionContext, mmlDiagnostics: vscode.DiagnosticCollection): void {
  if (vscode.window.activeTextEditor) {
    refreshDiagnostics(vscode.window.activeTextEditor.document, mmlDiagnostics);
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        refreshDiagnostics(editor.document, mmlDiagnostics);
      }
    })
  );

  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e) => refreshDiagnostics(e.document, mmlDiagnostics)));

  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((doc) => mmlDiagnostics.delete(doc.uri)));
}
