#[Hello!](https://twitter.com/lyrhymer)

Hey, I don't know how you ended up here lol, did you actually click the side link on that
[twitter profile?](https://twitter.com/lyrhymer)

- I get the current top charts off [Musixmatch's API](https://developer.musixmatch.com/documentation)
- I select a random song from the top charts
- I get the "snippet" or best lyrical summary of the song (which; so far, is just the most prominent line)
- I grab the last word of that snippet string
- I find word suggestions if that word isn't a real word, using [Datamuse's API](http://www.datamuse.com/api/)
- I find rhymes of that first suggestion, and pick a random one
- I post it using the 3rd party [Twitter API](https://github.com/ttezel/twit)
- It currently runs on my main machine, but I'll be moving it over to my oh-so beloved Raspberry Pi 3 in the near future

Spotted any strange issues that I _(the great idiot of modern times)_ did not catch? Open
a new issue here! I really don't know why you'd want to do this, but also feel free to
make pull requests!

It's terrible, you shouldn't be here. Shoo!