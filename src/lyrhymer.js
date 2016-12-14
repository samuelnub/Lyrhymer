var http = require("http");
var twitter = require("twit");
var secrets = require("./superSecretConfidentialStuff");

(function () {
    console.log(secrets.info);

    var curCount = 0;
    var interval = 1000 * 60* 60 * 0.5;
    var redoWait = 1000 * 20;
    var tweetCharLimit = 140;
    var date = new Date();

    var twit = new twitter({
        consumer_key: secrets.twitConKey,
        consumer_secret: secrets.twitConSec,
        access_token: secrets.twitAccTok,
        access_token_secret: secrets.twitAccTokSec,
        timeout_ms: 1000 * 60
    });

    // Prepare for callback hell!
    commence(false);
    function commence(once) {
        try {
            var mxmHost = "api.musixmatch.com";
            var mxmPathVer = "/ws/1.1/";

            // Get top charts
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
                    console.log("done with chart request!");
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
                            console.log("done with snippet request!");
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
                            var snippetLastSpaceIndex = snippetParsed.message.body.snippet.snippet_body.lastIndexOf(" ");
                            var snippetString = snippetParsed.message.body.snippet.snippet_body;
                            var snippetLastWord = snippetString.slice(snippetLastSpaceIndex + 1);

                            var wordHost = "api.datamuse.com";

                            // Get the suggested word of it^, if its a real word, the first index will return the same word (good!), if the word doesnt exist, eg starboy, it will return something like starboard, which still works! better than nothing
                            http.get({
                                host: wordHost,
                                path: "/sug?s=" + snippetLastWord.split(/[^a-z|A-Z|A-zÀ-ÿ]/).join("")
                            }, function getSuggested(res) {
                                var sugsBody = "";
                                res.on("data", function (d) {
                                    sugsBody += d;
                                });

                                res.on("error", function (err) {
                                    console.log("error getting suggested words!");
                                    if (!once) { setTimeout(commence, redoWait); }
                                    return;
                                });

                                res.on("end", function () {
                                    var sugsParsed;
                                    console.log("done with suggestion request!");
                                    try {
                                        sugsParsed = JSON.parse(sugsBody);
                                    }
                                    catch (err) {
                                        console.log("couldn't parse suggestion");
                                        if (!once) { setTimeout(commence, redoWait); }
                                        return;
                                    }

                                    var bestSug = sugsParsed[0];
                                    if (!bestSug) {
                                        console.log("no suggested words for: " + snippetLastWord);
                                        if (!once) { setTimeout(commence, redoWait); }
                                        return;
                                    }
                                    var bestSugWord = bestSug.word;

                                    // Get a random rhyme pertaining to that suggested word
                                    http.get({
                                        host: wordHost,
                                        path: "/words?rel_rhy=" + bestSugWord.split(" ").join("%20")
                                    }, function getRhyme(res) {
                                        var rhymesBody = "";
                                        res.on("data", function (d) {
                                            rhymesBody += d;
                                        });

                                        res.on("error", function (err) {
                                            console.log("error getting rhymes!");
                                            if (!once) { setTimeout(commence, redoWait); }
                                            return;
                                        });

                                        res.on("end", function () {
                                            var rhymesParsed;
                                            console.log("done with rhyme request!");
                                            try {
                                                rhymesParsed = JSON.parse(rhymesBody);
                                            }
                                            catch (err) {
                                                console.log("couldn't parse rhyme");
                                                if (!once) { setTimeout(commence, redoWait); }
                                                return;
                                            }

                                            var rhyme = rhymesParsed[Object.keys(rhymesParsed).length * Math.random() << 0];
                                            if (!rhyme) {
                                                console.log("there wasn't any suitable rhyme for the snippet word: " + snippetLastWord);
                                                if (!once) { setTimeout(commence, redoWait); }
                                                return;
                                            }
                                            var rhymeWord = rhyme.word;

                                            // We're done with all the requests! time to post stuff
                                            // regex accented characters http://stackoverflow.com/questions/20690499/concrete-javascript-regex-for-accented-characters-diacritics
                                            var artistHash = "#" + track.artist_name.split(/[^a-z|A-Z|0-9|A-zÀ-ÿ]/).join("");

                                            var finalMessage = [
                                                snippetString.substring(0, snippetLastSpaceIndex),
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
                                                    var ourHandle = data.user.screen_name;

                                                    var replyMessage = [
                                                        "@",
                                                        ourHandle,
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
                                                        console.log("Made Tweet number " + ++curCount + " this run!\n" + "Time of completion: " + date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate() + "T" + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "Z\n");
                                                        if (!once) { setTimeout(commence, interval); }
                                                        return;
                                                    });
                                                });
                                            }
                                        });
                                    });
                                });
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
        }
    }
})();