# hiive.com

This is the initial redesign of hiive.com for Andrew Rollings.

## Running the Site Locally

This site is built on the [Jekyll](https://jekyllrb.com/) platform, with many [GitHub-Pages](https://pages.github.com/)-friendly customizations via a project known as [JekyllFaces](http://jekyllfaces.com/), developed by [Joe Hall](https://stimulus/groundh0g). With Jekyll as its base, the documentation for Jekyll and the [GitHub Pages gem](https://github.com/github/pages-gem) should be applicable here.

On your first local build, you'll need to install the required Ruby gems from the `docs` folder.

```shell script
bundle install
```

Now, whenever you want to kick off a local instance of your site, run the jekyll server from the `docs` folder.

```shell script
bundle exec jekyll server
```

At this point, your site should be running on [localhost:4000](http://localhost:4000/). Marvel at its glory. When you're done admiring your work, you can make edits to your site and see them appear in the browser, in realtime.

When you're ready to release the site into the wild, be sure to edit the _config.yml from this ...

```yaml
url: "https://groundh0g.github.io" # the base hostname & protocol for your site, e.g. http://example.com
baseurl: "/hiive.com" # the subpath of your site, e.g. /blog
```

... to this ...

```yaml
url: "https://hiive.com" # the base hostname & protocol for your site, e.g. http://example.com
baseurl: "" # the subpath of your site, e.g. /blog
```
