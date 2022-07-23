import * as vscode from "vscode";
import * as fs from "fs";
import { regexMap, hoverMap, CurlyBracesType } from "./map";

export function subscribeCompletionItem(context: vscode.ExtensionContext): void {
  const replacementCompletionItemProvider = vscode.languages.registerCompletionItemProvider("mml", {
    provideCompletionItems(doc: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
      let replacementCompletionItems: vscode.CompletionItem[] = [];

      let curlyBracesType: CurlyBracesType = "NONE";

      //Replacement
      let inReplacement = false;
      let replacementKey = "";
      let replacementValue = "";
      let replacementLineIndex = 0;
      let replacementMatch: RegExpExecArray | undefined = undefined;
      let replacementMap: { key: string; value: string }[] = [];
      let replacementIndexShiftArray: { start: number; keyName: string; endValue: number; shift: number }[][] = new Array();

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

            switch (curlyBracesType) {
              case "SAMPLES":
              case "INSTRUMENTS":
              case "SPC":
                //curlyBracesEnd(})
                if (match.groups.curlyBracesEnd !== undefined) {
                  curlyBracesType = "NONE";
                }
                break;

              case "NONE":
                //replacementBegin("=)
                if (match.groups.replacementBegin !== undefined) {
                  if (!inReplacement) {
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
                    curlyBracesType = "SAMPLES";
                  }

                  //signInstruments(#instruments)
                  else if (match.groups.signInstruments !== undefined) {
                    curlyBracesType = "INSTRUMENTS";
                  }

                  //signSpc(#Spc)
                  else if (match.groups.signSpc !== undefined) {
                    curlyBracesType = "SPC";
                  }
                }
                break;
            }
            if (position.line <= lineIndex && position.character < getShiftedIndex(lineIndex, match.index) + match[0].length) {
              break;
            }
          }
        }

        if (position.line <= lineIndex) {
          break;
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
            case "INSTRUMENTS":
            case "SPC":
              regex = new RegExp(regexMap.curlyBracesEnd, "g");
              break;
            default:
              regex = new RegExp([regexMap.replacementBegin, regexMap.quotation, regexMap.signSamples, regexMap.signInstruments, regexMap.signSpc].join("|"), "g");
              break;
          }
          regex.lastIndex = lastIndex;
          return regex;
        }
      }

      function getShiftedIndex(lineIndex: number, index: number): number {
        let shift = 0;
        for (const replacementIndexShift of replacementIndexShiftArray[lineIndex]) {
          //pre replacement
          if (index < replacementIndexShift.start) {
            return index + shift;
          }
          //in replacement
          else if (index < replacementIndexShift.endValue) {
            return replacementIndexShift.start + shift;
          }
          //post replacement
          else {
            shift += replacementIndexShift.shift;
          }
        }
        return index + shift;
      }

      for (const r of replacementMap) {
        let completionItem = new vscode.CompletionItem(r.key, vscode.CompletionItemKind.Variable);
        completionItem.documentation = new vscode.MarkdownString("**Replacement call**\n\n*Value :*\n```\n" + r.value + "\n```");
        replacementCompletionItems.push(completionItem);
      }

      let completionList = new vscode.CompletionList(replacementCompletionItems, false);
      return Promise.resolve(completionList);
    },
  });

  const sampleCompletionItemProvider = vscode.languages.registerCompletionItemProvider(
    "mml",
    {
      provideCompletionItems(doc: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
        let sampleCompletionItems: vscode.CompletionItem[] = [];

        let curlyBracesType: CurlyBracesType = "NONE";

        let previousMatch = undefined;

        //CurlyBraces
        let inCurlyBraces = false;

        //Sample
        let samplePath = "";
        let sampleArray: string[] = new Array();

        //curlyBracesType check
        for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
          let text = doc.lineAt(lineIndex).text;

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

          //Repeat until there are no matching words
          let match;
          let lastIndex = 0;
          while ((match = getRegexMap().exec(text)) !== null) {
            if (match.groups !== undefined) {
              //Match variables
              lastIndex = match.index + match[0].length;

              switch (curlyBracesType) {
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
                        sampleArray.push(text.substring(quotationMatch.index + 1, match.index));
                        quotationMatch = undefined;
                      }
                    }
                  }
                  break;
                case "INSTRUMENTS":
                case "SPC":
                  //curlyBracesEnd(})
                  if (match.groups.curlyBracesEnd !== undefined) {
                    curlyBracesType = "NONE";
                  }
                  break;

                case "NONE":
                  //quotation(")
                  if (match.groups.quotation !== undefined) {
                    if (previousMatch?.groups?.signPath !== undefined && quotationMatch === undefined) {
                      quotationMatch = match;
                    } else if (quotationMatch !== undefined) {
                      samplePath = "\\" + text.substring(quotationMatch.index + 1, match.index).replace("/", "\\");
                      quotationMatch = undefined;
                    }
                  }

                  //quotationMatch check
                  else if (quotationMatch === undefined) {
                    //signSamples(#samples)
                    if (match.groups.signSamples !== undefined) {
                      curlyBracesType = "SAMPLES";
                    }

                    //signInstruments(#instruments)
                    else if (match.groups.signInstruments !== undefined) {
                      curlyBracesType = "INSTRUMENTS";
                    }

                    //signSpc(#Spc)
                    else if (match.groups.signSpc !== undefined) {
                      curlyBracesType = "SPC";
                    }
                  }
                  break;
              }
              if (position.line <= lineIndex && position.character < match.index + match[0].length) {
                break;
              }

              previousMatch = match;
            }
          }

          if (position.line <= lineIndex) {
            break;
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
                regex = new RegExp([regexMap.quotation, regexMap.curlyBracesBegin, regexMap.curlyBracesEnd].join("|"), "g");
                break;
              case "INSTRUMENTS":
              case "SPC":
                regex = new RegExp(regexMap.curlyBracesEnd, "g");
                break;
              default:
                regex = new RegExp([regexMap.replacementBegin, regexMap.quotation, regexMap.signSamples, regexMap.signInstruments, regexMap.signSpc, regexMap.signPath].join("|"), "g");
                break;
            }
            regex.lastIndex = lastIndex;
            return regex;
          }
        }

        switch (curlyBracesType) {
          case "SAMPLES":
            if (fs.existsSync((vscode.workspace.getConfiguration("mmlamktoolkit").get("AddmusickPath") as string) + "\\samples" + samplePath)) {
              for (const sample of fs.readdirSync((vscode.workspace.getConfiguration("mmlamktoolkit").get("AddmusickPath") as string) + "\\samples" + samplePath)) {
                let completionItem = new vscode.CompletionItem(sample, vscode.CompletionItemKind.File);
                completionItem.insertText = new vscode.SnippetString(sample + '"');
                sampleCompletionItems.push(completionItem);
              }
            }
            break;
          case "INSTRUMENTS":
            for (const sample of sampleArray) {
              let completionItem = new vscode.CompletionItem(sample, vscode.CompletionItemKind.Variable);
              completionItem.insertText = new vscode.SnippetString(sample + '" $${1:aa} $${2:bb} $${3:cc} $${4:dd} $${5:ee}');
              sampleCompletionItems.push(completionItem);
            }
            break;
          case "NONE":
            if (doc.lineAt(position.line).text[position.character - 2] === "(") {
              for (const sample of sampleArray) {
                let completionItem = new vscode.CompletionItem(sample, vscode.CompletionItemKind.Variable);
                completionItem.insertText = new vscode.SnippetString(sample + '", $${1:00}');
                sampleCompletionItems.push(completionItem);
              }
            } else {
              sampleCompletionItems = [
                {
                  label: '"=" (Replacement)',
                  kind: vscode.CompletionItemKind.Keyword,
                  insertText: new vscode.SnippetString('${1:var}="'),
                  documentation: new vscode.MarkdownString(hoverMap.replacement),
                },
              ];
            }
            break;
        }
        let completionList = new vscode.CompletionList(sampleCompletionItems, false);
        return Promise.resolve(completionList);
      },
    },
    '"'
  );

  const specialCompletionItemProvider = vscode.languages.registerCompletionItemProvider(
    "mml",
    {
      provideCompletionItems(doc: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
        let specialCompletionItems: vscode.CompletionItem[];

        let curlyBracesType: CurlyBracesType = "NONE";

        //curlyBracesType check
        for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
          let text = doc.lineAt(lineIndex).text;

          //Exclude comment(;)
          if (text.includes(";")) {
            const index = text.indexOf(";");
            if (index === 0) {
              continue;
            }
            text = text.substring(0, index);
          }

          //Repeat until there are no matching words
          let match;
          let lastIndex = 0;
          while ((match = getRegexMap().exec(text)) !== null) {
            if (match.groups !== undefined) {
              //Match variables
              lastIndex = match.index + match[0].length;

              switch (curlyBracesType) {
                case "SAMPLES":
                case "INSTRUMENTS":
                case "SPC":
                  //curlyBracesEnd(})
                  if (match.groups.curlyBracesEnd !== undefined) {
                    curlyBracesType = "NONE";
                  }
                  break;

                case "NONE":
                  //signSamples(#samples)
                  if (match.groups.signSamples !== undefined) {
                    curlyBracesType = "SAMPLES";
                  }

                  //signInstruments(#instruments)
                  else if (match.groups.signInstruments !== undefined) {
                    curlyBracesType = "INSTRUMENTS";
                  }

                  //signSpc(#Spc)
                  else if (match.groups.signSpc !== undefined) {
                    curlyBracesType = "SPC";
                  }
                  break;
              }
              if (position.line <= lineIndex && position.character < match.index + match[0].length) {
                break;
              }
            }
          }

          if (position.line <= lineIndex) {
            break;
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
              case "INSTRUMENTS":
              case "SPC":
                regex = new RegExp(regexMap.curlyBracesEnd, "g");
                break;
              default:
                regex = new RegExp([regexMap.signSamples, regexMap.signInstruments, regexMap.signSpc].join("|"), "g");
                break;
            }
            regex.lastIndex = lastIndex;
            return regex;
          }
        }

        switch (curlyBracesType) {
          case "SAMPLES":
            specialCompletionItems = [
              {
                label: "default",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString("default"),
                documentation: new vscode.MarkdownString(hoverMap.signSampleGroup),
              },
              {
                label: "optimized",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString("optimized"),
                documentation: new vscode.MarkdownString(hoverMap.signSampleGroup),
              },
            ];
            break;
          case "SPC":
            specialCompletionItems = [
              {
                label: "author",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString('author "${1:Author\'s name}"'),
                documentation: new vscode.MarkdownString(hoverMap.signAuthor),
              },
              {
                label: "game",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString('game "${1:Game\'s name}"'),
                documentation: new vscode.MarkdownString(hoverMap.signGame),
              },
              {
                label: "comment",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString('comment "${1:A comment}"'),
                documentation: new vscode.MarkdownString(hoverMap.signComment),
              },
              {
                label: "title",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString('title "${1:Song\'s name}"'),
                documentation: new vscode.MarkdownString(hoverMap.signTitle),
              },
              {
                label: "length",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString('length "${1:Song\'s length}"'),
                documentation: new vscode.MarkdownString(hoverMap.signLength),
              },
            ];
            break;
          case "NONE":
            specialCompletionItems = [
              {
                label: "samples",
                kind: vscode.CompletionItemKind.Snippet,
                insertText: new vscode.SnippetString("samples\n{\n\t#optimized\n\t\n}"),
                documentation: new vscode.MarkdownString(hoverMap.signSamples),
              },
              {
                label: "instruments",
                kind: vscode.CompletionItemKind.Snippet,
                insertText: new vscode.SnippetString("instruments\n{\n\t\n}"),
                documentation: new vscode.MarkdownString(hoverMap.signInstruments),
              },
              {
                label: "spc",
                kind: vscode.CompletionItemKind.Snippet,
                insertText: new vscode.SnippetString('spc\n{\n\t#author "${1:Author\'s name}"\n\t#game "${2:Game\'s name}"\n\t#comment "${3:A comment}"\n\t#title "${4:Song\'s name}"\n}'),
                documentation: new vscode.MarkdownString(hoverMap.signSpc),
              },
              {
                label: "pad",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString("pad ${1:value}"),
                documentation: new vscode.MarkdownString(hoverMap.signPad),
              },
              {
                label: "path",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString('path "${1:path}"'),
                documentation: new vscode.MarkdownString(hoverMap.signPath),
              },
              {
                label: "halvetempo",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString("halvetempo"),
                documentation: new vscode.MarkdownString(hoverMap.signHalvetempo),
              },
              {
                label: "option tempoimmunity",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString("option tempoimmunity"),
                documentation: new vscode.MarkdownString(hoverMap.signOption + hoverMap.signOptionTempoimmunity),
              },
              {
                label: "option dividetempo",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString("option dividetempo ${1:value}"),
                documentation: new vscode.MarkdownString(hoverMap.signOption + hoverMap.signOptionDividetempo),
              },
              {
                label: "option smwvtable",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString("option smwvtable"),
                documentation: new vscode.MarkdownString(hoverMap.signOption + hoverMap.signOptionSmwvtable),
              },
              {
                label: "option noloop",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString("option noloop"),
                documentation: new vscode.MarkdownString(hoverMap.signOption + hoverMap.signOptionNoloop),
              },
              {
                label: "define",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString("define ${1:variable} ${2:num}"),
                documentation: new vscode.MarkdownString(hoverMap.signDefine),
              },
              {
                label: "undef",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString("undef ${1:variable}"),
                documentation: new vscode.MarkdownString(hoverMap.signUndef),
              },
              {
                label: "ifdef",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString("ifdef ${1:variable}"),
                documentation: new vscode.MarkdownString(hoverMap.signIfdef),
              },
              {
                label: "ifndef",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString("ifndef ${1:variable}"),
                documentation: new vscode.MarkdownString(hoverMap.signIfndef),
              },
              {
                label: "if",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString("if ${1:variable} ${2:==} ${3:num}"),
                documentation: new vscode.MarkdownString(hoverMap.signIf),
              },
              {
                label: "endif",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString("endif"),
                documentation: new vscode.MarkdownString(hoverMap.signEndif),
              },
              {
                label: "error",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString("error"),
                documentation: new vscode.MarkdownString(hoverMap.signError),
              },
              {
                label: "amk",
                kind: vscode.CompletionItemKind.Keyword,
                insertText: new vscode.SnippetString("amk 2"),
                documentation: new vscode.MarkdownString(hoverMap.signAmk),
              },
            ];
            break;
          default:
            specialCompletionItems = [];
            break;
        }
        let completionList = new vscode.CompletionList(specialCompletionItems, false);
        return Promise.resolve(completionList);
      },
    },
    "#"
  );

  const hexCompletionItemProvider = vscode.languages.registerCompletionItemProvider(
    "mml",
    {
      provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
        let hexCompletionItems: vscode.CompletionItem[] = [
          {
            label: "$DA (Instrument)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("DA $${1:XX}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandDA),
          },
          {
            label: "$DB (Pan)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("DB $${1:XX}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandDB),
          },
          {
            label: "$DC (Pan fade)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("DC $${1:XX} $${2:YY}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandDC),
          },
          {
            label: "$DD (Pitch bend)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("DD $${1:XX} $${2:YY} $${3:ZZ}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandDD),
          },
          {
            label: "$DE (Vibrato)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("DE $${1:XX} $${2:YY} $${3:ZZ}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandDE),
          },
          {
            label: "$DF (Vibrato off)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("DF"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandDF),
          },
          {
            label: "$E0 (Global volume)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("E0 $${1:XX}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandE0),
          },
          {
            label: "$E1 (Global volume fade)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("E1 $${1:XX} $${2:YY}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandE1),
          },
          {
            label: "$E2 (Tempo)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("E2 $${1:XX}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandE2),
          },
          {
            label: "$E3 (Tempo fade)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("E3 $${1:XX} $${2:YY}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandE3),
          },
          {
            label: "$E4 (Global transpose)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("E4 $${1:XX}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandE4),
          },
          {
            label: "$E5 (Tremolo)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("E5 $${1:XX} $${2:YY} $${3:ZZ}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandE5),
          },
          {
            label: "$E6 $00 (Subloop start)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("E6 \\$00"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandE600),
          },
          {
            label: "$E6 (Subloop end)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("E6 $${1:XX}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandE6XX),
          },
          {
            label: "$E7 (Volume)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("E7 $${1:XX}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandE7),
          },
          {
            label: "$E8 (Volume fade)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("E8 $${1:XX} $${2:YY}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandE8),
          },
          {
            label: "$E9 (Loop)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("E9"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandE9),
          },
          {
            label: "$EA (Vibrato fade)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("EA $${1:XX}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandEA),
          },
          {
            label: "$EB (Pitch envelope (release))",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("EB $${1:XX} $${2:YY} $${3:ZZ}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandEB),
          },
          {
            label: "$EC (Pitch envelope (attack))",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("EC $${1:XX} $${2:YY} $${3:ZZ}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandEC),
          },
          {
            label: "$ED (ADSR)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("ED $${1:DA} $${2:SR}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandEDXX),
          },
          {
            label: "$ED $80 (GAIN)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("ED \\$80 $${1:YY}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandED80),
          },
          {
            label: "$EE (Tune channel)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("EE $${1:XX}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandEE),
          },
          {
            label: "$EF (Echo 1)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("EF $${1:XX} $${2:YY} $${3:ZZ}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandEF),
          },
          {
            label: "$F0 (Echo off)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("F0"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandF0),
          },
          {
            label: "$F1 (Echo 2)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("F1 $${1:XX} $${2:YY} $${3:ZZ}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandF1),
          },
          {
            label: "$F2 (Echo fade)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("F2 $${1:XX} $${2:YY} $${3:ZZ}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandF2),
          },
          {
            label: "$F3 (Sample load)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("F3 $${1:XX} $${2:YY}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandF3),
          },
          {
            label: "$F4 $00 (Yoshi drums)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("F4 \\$00"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandF400),
          },
          {
            label: "$F4 $01 (Legato)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("F4 \\$01"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandF401),
          },
          {
            label: "$F4 $02 (Light staccato)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("F4 \\$02"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandF402),
          },
          {
            label: "$F4 $03 (Echo toggle)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("F4 \\$03"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandF403),
          },
          {
            label: "$F4 $05 (SNES sync)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("F4 \\$05"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandF405),
          },
          {
            label: "$F4 $06 (Yoshi drums)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("F4 \\$06"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandF406),
          },
          {
            label: "$F4 $07 (Tempo hike off)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("F4 \\$07"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandF407),
          },
          {
            label: "$F4 $08 (Velocity table)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("F4 \\$08"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandF408),
          },
          {
            label: "$F4 $09 (Restore instrument)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("F4 \\$09"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandF409),
          },
          {
            label: "$F5 (FIR filter)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("F5 $${1:X0} $${2:X1} $${3:X2} $${4:X3} $${5:X4} $${6:X5} $${7:X6} $${8:X7}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandF5),
          },
          {
            label: "$F6 (DSP write)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("F6 $${1:XX} $${2:YY}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandF6),
          },
          {
            label: "$F8 (Enable noise)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("F8 $${1:XX}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandF8),
          },
          {
            label: "$F9 (Data send)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("F9 $${1:XX} $${2:YY}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandF9),
          },
          {
            label: "$FA $00 (Pitch modulation)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("FA \\$00 $${1:XX}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandFA00),
          },
          {
            label: "$FA $01 (GAIN)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("FA \\$01 $${1:XX}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandFA01),
          },
          {
            label: "$FA $02 (Semitone tune)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("FA \\$02 $${1:XX}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandFA02),
          },
          {
            label: "$FA $03 (Amplify)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("FA \\$03 $${1:XX}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandFA03),
          },
          {
            label: "$FA $04 (Echo buffer reserve)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("FA \\$04 $${1:XX}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandFA04),
          },
          {
            label: "$FB (Arpeggio)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("FB $${1:XX} $${2:YY} $${3:...}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandFBXX),
          },
          {
            label: "$FB $80 (Trill)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("FB \\$80 $${1:YY} $${2:ZZ}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandFB80),
          },
          {
            label: "$FB $81 (Glissando)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("FB \\$81 $${1:YY} $${2:ZZ}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandFB81),
          },
          {
            label: "$FC (Remote commands)",
            kind: vscode.CompletionItemKind.Method,
            insertText: new vscode.SnippetString("FC $${1:WW} $${2:XX} $${3:YY} $${4:ZZ}"),
            documentation: new vscode.MarkdownString(hoverMap.hexCommandFC),
          },
        ];
        let completionList = new vscode.CompletionList(hexCompletionItems, false);
        return Promise.resolve(completionList);
      },
    },
    "$"
  );

  context.subscriptions.push(replacementCompletionItemProvider);
  context.subscriptions.push(sampleCompletionItemProvider);
  context.subscriptions.push(specialCompletionItemProvider);
  context.subscriptions.push(hexCompletionItemProvider);
}
