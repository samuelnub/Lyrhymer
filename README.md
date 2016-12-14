#[Hello!](https://twitter.com/lyrhymer)

Hey, I don't know how you ended up here lol, did you actually click the side link on that
[twitter profile?](https://twitter.com/lyrhymer)

####Here's the general process:
- I get the current top charts off [Musixmatch](https://developer.musixmatch.com/documentation)
- I select a random song from the top charts with Musixmatch
- I get the "snippet" or best lyrical summary of the song (which; so far, is just the most prominent line) from Musixmatch
- I grab the last word of that snippet string
- I find word suggestions if that word isn't a real word, using [Datamuse](http://www.datamuse.com/api/)
- I find rhymes of that first suggestion, and pick a random one, with Datamuse
- I post it using the 3rd party [Twitter API](https://github.com/ttezel/twit)
- It also opens up a constant stream with Twitter, replying to any @mentions with a similarly-styled rhyme
- Currently runs on my beloved Raspberry Pi 3 that had previously been horribly underutilised
- Changes/updates are done/tested on my regular machine, then committed to this remote repo, then pulled back into the Pi's clone of it

####Stuff required that's not in this repo:
- Node modules needed: (at the root of Lyrhymer/)
  - [Twit](https://github.com/ttezel/twit)
- superSecretConfidentialStuff.js, in the src folder, which has all the public & private keys for the Musixmatch and Twitter APIs

####If you _really_ want to run this steaming hot load:
- Clone this into the folder you detest the most
- cd into the main Lyrhymer/ folder and hit up `npm install` to retrieve dependencies
- Get your own Musixmatch and Twitter API keys, and save them into a new superSecretConfidentualStuff.js file in the src folder (`exports.mxmApiKey = "..."` etc., you can check out the main lyrhymer.js to see what the exports were named as)
- Back in the main root folder, `node src/lyrhymer.js` should start it up, if it doesn't work, you can heave a sigh of relief

####Planned for the ~~distant~~ future:
- ~~Stream to listen and reply (badly) to mentions~~
- Some sorta incentive to follow it lol, maybe give a free taco or something.

Spotted any strange issues that I _(the great idiot of modern times)_ did not catch? Open
a new issue here! I really don't know why you'd want to do this, but also feel free to
make pull requests! Right now, the main "stuff" is done, so new commits are mostly just
going to be regarding proper exception handling. I'm by no means comfortable with HTTP 
requests, so if you see something super atrocious (or lack thereof), let me know!

It's terrible, you shouldn't be here. Shoo!