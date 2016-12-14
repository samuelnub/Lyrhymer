var http = require("http");
var twitter = require("twit");
var secrets = require("./superSecretConfidentialStuff");

(function () {
    console.log(secrets.info);

    var curCount = 0;
    var interval = 1000 * 60 * 60 * 0.5;
    var redoWait = 1000 * 20;
    var tweetCharLimit = 140;
    var ourTwitHandle = "lyrhymer";

    var twit = new twitter({
        consumer_key: secrets.twitConKey,
        consumer_secret: secrets.twitConSec,
        access_token: secrets.twitAccTok,
        access_token_secret: secrets.twitAccTokSec,
        timeout_ms: 1000 * 60
    });

    var getLastWord = function (message) {
        // getting last word http://stackoverflow.com/questions/20883404/javascript-returning-the-last-word-in-a-string
        var lastSpaceIndex = message.lastIndexOf(" ");
        var lastWord = message.slice(lastSpaceIndex + 1);
        var messageSansLastWord = message.substring(0, lastSpaceIndex).split(/[{}()"']/).join("");
        return {
            index: lastSpaceIndex,
            word: lastWord,
            others: messageSansLastWord
        };
    };

    var getSugRhyme = function (word, callback /*needs one argument, a string with the returned rhyme*/, failureCallback /*Should be a lambda with a single line of "setTimeout"*/) {
        var wordHost = "api.datamuse.com";
        var wordPathSug = "/sug?s=";
        var wordPathRhy = "/words?rel_rhy=";

        http.get({
            host: wordHost,
            path: wordPathSug + word.split(/[^a-z|A-Z|A-zÀ-ÿ]/).join("")
        }, function getSugs(res) {
            var sugsBody = "";
            res.on("data", function (d) {
                sugsBody += d;
            });

            res.on("error", function (err) {
                console.log("Error getting suggestions in request!");
                console.log(err);
                if (typeof failureCallback === "function") {
                    failureCallback();
                }
                return;
            });

            res.on("end", function () {
                var sugsParsed;
                console.log("Done with suggestions request!");
                try {
                    sugsParsed = JSON.parse(sugsBody);
                }
                catch (err) {
                    console.log("Error parsing suggestions!");
                    console.log(err);
                    if (typeof failureCallback === "function") {
                        failureCallback();
                    }
                    return;
                }

                var bestSug = sugsParsed[0];
                if (!bestSug) {
                    console.log("Couldn't find a suggestion to rhyme with!");
                    if (typeof failureCallback === "function") {
                        failureCallback();
                    }
                    return;
                }
                var bestSugWord = bestSug.word;

                http.get({
                    host: wordHost,
                    path: wordPathRhy + bestSugWord.split(" ").join("%20")
                }, function getRhymes(res) {
                    var rhymesBody = "";
                    res.on("data", function (d) {
                        rhymesBody += d;
                    });

                    res.on("error", function (err) {
                        console.log("Error getting rhymes in request!");
                        console.log(err);
                        if (typeof failureCallback === "function") {
                            failureCallback();
                        }
                        return;
                    });

                    res.on("end", function () {
                        var rhymesParsed;
                        console.log("Done with rhymes request!");
                        try {
                            rhymesParsed = JSON.parse(rhymesBody);
                        }
                        catch (err) {
                            console.log("Error parsing rhymes!");
                            console.log(err);
                            if (typeof failureCallback === "function") {
                                failureCallback();
                            }
                            return;
                        }

                        var rhyme = rhymesParsed[Object.keys(rhymesParsed).length * Math.random() << 0];
                        if (!rhyme) {
                            console.log("Couldn't find any words that rhymed with: " + bestSugWord);
                            if (typeof failureCallback === "function") {
                                failureCallback();
                            }
                            return;
                        }
                        var rhymeWord = rhyme.word;

                        callback(rhymeWord);
                    });
                });
            });
        });
    };

    (function initTwitStream(once) {
        var twitStream = twit.stream("statuses/filter", { track: "@" + ourTwitHandle });

        twitStream.on("connected", function (response) {
            console.log("Successfully connected to the twitter stream!");
            return;
        });

        twitStream.on("disconnect", function (message) {
            console.log("Disconnected from the twitter stream! Likely because you're connecting elsewhere!");
            console.log(message);
            return;
        });

        twitStream.on("error", function (error) {
            console.log("The twitter stream encountered an error!");
            console.log(error);
            return;
        });

        twitStream.on("tweet", function (tweet) {
            var theirHandle = tweet.user.screen_name;
            if (theirHandle === ourTwitHandle) {
                return;
            }

            // I _could_ break up the "commence" into better seperate; reusable functions, but I'm an extremely bad person, and to be honest, there's going to be so many configs that I might as well re-write them each time
            // TODO: make it more dry.
            try {
                console.log("\nsomeone tweeted me! " + theirHandle);

                var theirTweetIDstr = tweet.id_str;

                // Be nice you cold; heartless being!
                twit.post("favorites/create", { id: theirTweetIDstr }, function (err, data, response) {
                    if (data.errors) {
                        console.log("Error occurred while trying to favourite " + theirHandle + "'s tweet!");
                        console.log(data.errors);
                    }
                    else {
                        console.log("Successfully favourited " + theirHandle + "'s tweet!");
                    }
                });

                if (tweet.in_reply_to_status_id) {
                    console.log("It's a reply to me, so I shouldn't be continuing!");
                    return;
                }

                var theirSentence = tweet.text.replace("@" + ourTwitHandle, "");

                getSugRhyme(getLastWord(theirSentence).word.split(/[^a-z|A-Z|A-zÀ-ÿ]/).join(""), function (rhymeWord) {
                    var finalMessage = [
                        "@", theirHandle,
                        "", // the sentence got rid of the handle, which left a trailing space already!
                        getLastWord(theirSentence).others,
                        " ",
                        rhymeWord
                    ].join("");
                    if (finalMessage.length >= tweetCharLimit) {
                        console.log("Initial reply message is too long! Let's try replying with just the rhymed word!");
                        finalMessage = [
                            "@", theirHandle,
                            "",
                            "Here is a wise rhyming word!",
                            " ",
                            rhymeWord
                        ].join("");
                        if (finalMessage.length >= tweetCharLimit) {
                            console.log("Still too long! Damn.");
                            finalMessage = [
                                "@", theirHandle,
                                "",
                                rhymeWord
                            ].join("");
                            if (finalMessage.length >= tweetCharLimit) {
                                console.log("Damnit, let's just apologise about not being able to fulfil this wonderful request of theirs :(");
                                finalMessage = [
                                    "@", theirHandle,
                                    "",
                                    "hey man, your request was too long for me, sorry!"
                                ].join("");
                                if (finalMessage.length >= tweetCharLimit) {
                                    console.log("Agh, screw it!");
                                    return;
                                }
                            }
                        }
                    }
                    var suffixMessage = " " + "\ud83d\udc36\u2764"; // the beloved dog and heart emoji duo
                    if ((finalMessage + suffixMessage).length < tweetCharLimit) {
                        finalMessage += suffixMessage;
                    }

                    twit.post("statuses/update", { in_reply_to_status_id: theirTweetIDstr, status: finalMessage }, function (err, data, response) {
                        if (data.errors) {
                            console.log("whoops! got an error while trying to reply to someone's tweet!");
                            console.log(data.errors);
                            return;
                        }
                        console.log("Successfully replied to " + theirHandle + " with their tweet ID of " + tweet.id_str);
                        return;
                    });
                } /*, potential callback, but this is just a one-time thing, since its a stream*/);
            }
            catch (err) {
                console.log("Caught a pesky exception while trying to respond to a tweet from the stream!");
                console.log(err);
                return;
            }
        });
    })();

    // Prepare for callback hell!
    (function commence(once) {
        try {
            // Get top charts
            var mxmHost = "api.musixmatch.com";
            var mxmPathVer = "/ws/1.1/";

            http.get({
                host: mxmHost,
                path: mxmPathVer + "chart.tracks.get?" +
                "apikey=" + secrets.mxmApiKey + "&" +
                "page=" + 1 + "&" +
                "page_size=" + 100 + "&" +
                "f_has_lyrics=" + 1 // TODO: magic strings
            }, function getTopCharts(res) {
                var chartBody = "";
                res.on("data", function (d) {
                    chartBody += d;
                });

                res.on("error", function (err) {
                    console.log("error getting charts!");
                    if (!once) { setTimeout(commence, redoWait); }
                    return;
                });

                res.on("end", function () {
                    var chartParsed;
                    console.log("Done with chart request!");
                    try {
                        chartParsed = JSON.parse(chartBody);
                    }
                    catch (err) {
                        console.log("Couldn't parse chart");
                        if (!once) { setTimeout(commence, redoWait); }
                        return;
                    }

                    if (chartParsed.message.header.status_code !== 200) {
                        console.log("Status code for chart response isn't lookin good!");
                        console.log(chartParsed);
                        if (!once) { setTimeout(commence, redoWait); }
                        return;
                    }

                    // Get one of the tracks from the charts
                    // pick random object element, thanks SO http://stackoverflow.com/questions/2532218/pick-random-property-from-a-javascript-object
                    var track = chartParsed.message.body.track_list[Object.keys(chartParsed.message.body.track_list).length * Math.random() << 0].track;
                    http.get({
                        host: mxmHost,
                        path: mxmPathVer + "track.snippet.get?" +
                        "apikey=" + secrets.mxmApiKey + "&" +
                        "track_id=" + track.track_id
                    }, function getSnippetFromTrack(res) {
                        var snippetBody = "";
                        res.on("data", function (d) {
                            snippetBody += d;
                        });

                        res.on("error", function (err) {
                            console.log("error getting charts!");
                            if (!once) { setTimeout(commence, redoWait); }
                            return;
                        });

                        res.on("end", function () {
                            var snippetParsed;
                            console.log("Done with snippet request!");
                            try {
                                snippetParsed = JSON.parse(snippetBody);
                            }
                            catch (err) {
                                console.log("couldn't parse snippet");
                                if (!once) { setTimeout(commence, redoWait); }
                                return;
                            }

                            if (snippetParsed.message.header.status_code !== 200) {
                                console.log("Status code for snippet response isn't lookin good!");
                                console.log(snippetParsed);
                                if (!once) { setTimeout(commence, redoWait); }
                                return;
                            }

                            // We've now got a snippet result, lets get the last word and dump that into a rhymer-finder
                            // getting last word http://stackoverflow.com/questions/20883404/javascript-returning-the-last-word-in-a-string
                            var snippetString = snippetParsed.message.body.snippet.snippet_body;

                            // Get the suggested word of it^, if its a real word, the first index will return the same word (good!), if the word doesnt exist, eg starboy, it will return something like starboard, which still works! better than nothing
                            getSugRhyme(getLastWord(snippetString).word.split(/[^a-z|A-Z|A-zÀ-ÿ]/).join(""), function (rhymeWord) {
                                // We're done with all the requests! time to post stuff
                                // regex accented characters http://stackoverflow.com/questions/20690499/concrete-javascript-regex-for-accented-characters-diacritics
                                var artistHash = "#" + track.artist_name.split(/[^a-z|A-Z|0-9|A-zÀ-ÿ]/).join("");

                                var finalMessage = [
                                    getLastWord(snippetString).others, // unclosed parentheses may be there
                                    " ",
                                    rhymeWord,
                                    " ",
                                    artistHash
                                ].join("");
                                if (finalMessage.length >= tweetCharLimit) {
                                    console.log("Our final message was too long :( let's redo");
                                    if (!once) { setTimeout(commence, redoWait); }
                                    return;
                                }
                                else {
                                    twit.post("statuses/update", { status: finalMessage }, function (err, data, response) {
                                        if (data.errors) {
                                            console.log("Couldn't post tweet!");
                                            console.log(data.errors);
                                            if (!once) { setTimeout(commence, redoWait); }
                                            return;
                                        }

                                        var thisStatusIDstr = data.id_str;

                                        var replyMessage = [
                                            "@",
                                            ourTwitHandle,
                                            " ",
                                            "Original line: \"",
                                            snippetString,
                                            "\" ",
                                            "Track title: ",
                                            track.track_name,
                                            ", lol"
                                        ].join("");
                                        if (replyMessage.length >= tweetCharLimit) {
                                            console.log("Reply message was too long, oh well :(");
                                            return;
                                        }

                                        twit.post("statuses/update", { in_reply_to_status_id: thisStatusIDstr, status: replyMessage }, function (err, data, response) {
                                            if (data.errors) {
                                                console.log("Couldn't make reply!");
                                                console.log(data.errors);
                                                if (!once) { setTimeout(commence, redoWait); }
                                                return;
                                            }
                                            console.log("Made Tweet number " + ++curCount + " this run!");
                                            if (!once) { setTimeout(commence, interval); }
                                            return;
                                        });
                                    });
                                }
                            }, function () {
                                if (!once) { setTimeout(commence, redoWait); } // I'm pretty thankful for that "dynamic this context' now lol   
                            });
                        });
                    });
                });
            });
        }
        catch (err) {
            console.log("Caught a pesky exception:");
            console.log(err);
            if (!once) { setTimeout(commence, redoWait); }
            return;
        }
    })();
})();