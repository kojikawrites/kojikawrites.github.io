---

metadata:
  title: Hiive<small><small>.com</small></small>
  tagline: The latest buzz around Hiive, LLC.
  description: > # Description for the site ...
    The launching point for all things Hiive, LLC. Personal and professional musings.
  legal: # used for privacy policy, terms of use, etc ...
    #company: Joe Hall  # {metadata.title} when blank
    #website: http://joehall.net/  # http://{metadata.title}.com when blank
    #jurisdiction: Georgia  # e.g. Georgia, "United States" when blank
  lang: en

customize:
  theme: darkly       # one of: cerulean | cosmo | cyborg | darkly | default | flatly | journal | litera | lumen | lux | materia | minty | pulse | sandstone | simplex | sketchy | slate | solar | spacelab | superhero | united | yeti
  http404: sticky     # one of: badge | default | dog | droids | glass | link | milk | monster | potty | shrug | sticky | tweet | zork
  #css: [ "main.css" ] # array of stylesheets to load after other styles
  #js:  [ "main.js"  ] # array of javascripts to load after other scripts

  homepage: custom    # one of: books | contributors | custom | docs | landing | legal | soon | webapps

build:
  use_cdn:      true # use CDN for 3rd-party scripts and styles?
  search:       true # create search index?

  #books:        true # process book content?
  #docs:         true # process documentation content?
  #landing:      true # process landing page content?
  #soon:         true # process coming soon content?
  #webapps:      true # process webapps content? (the overviews, not the webapp(s) itself)
  #legal:        true # process legal content?
  #contributors: true # process contributors content?

navbar:
  fixed:         true # sticky navbar?
  container:     true # is nav same width as content?

  ###search:       true # include search box in navbar (rightmost element)
  #books:        true # include link to books overview? {build.books} when blank
  #docs:         true # include link to docs overview? {build.docs} when blank
  #webapps:      true # include link to webapps overview? {build.webapps} when blank
  #legal:        true # include link to legal content overview? {build.legal} when blank
  #contributors: true # include link to contributors page? {build.contributors} when blank
  #pages:        true # include all other page content?

search:
  content:      full # one of: false | full | excerpt
  ignore:       [ ".css", ".js", ".json", ".xml", "/404.html", "/custom.html", "/status.html" ]
  groups:       [ "/content/contributors/", "/content/legal/" ]
  strip_chars:  "|'.,:;!?├─└…()[]#-/“”{}’"
  strip_quote:  true
  titles:       true # search titles from pages and posts?
  tags:         true # search post tags?
  pages:        true # search all page content?
  posts:        true # search all post content?

  #books:        true # search all book content? {build.books} when blank
  #docs:         true # search all docs content? {build.docs} when blank
  #landing:      true # search landing page content? {build.landing} when blank
  #soon:         true # search coming soon page content? {build.soon} when blank
  #webapps:      true # search webapps overview content? {build.webapps} when blank
  #legal:        true # search legal content? {build.legal} when blank
  #contributors: true # search contributors page? {build.contributors} when blank

fonticons:
  fontawesome: local # one of: false | local | cdn
  foundation:  false # one of: false | local | cdn
  glyphicons:  false # one of: false | local
  icomoon:     false # one of: false | local | cdn
  ionicons:    false # one of: false | local | cdn
  material:    false # one of: false | local | cdn
  octicons:    false # one of: false | local | cdn

analytics:
  provider: false # one of: false | google | matomo | getclicky | mixpanel | gauges 
  siteid: G-0000000000
  baseurl: # only used by matomo; ex: mysite.com/piwik

comments:
  provider: false # one of: false | facebook | disqus | intensedebate | duoshuo
  siteid: 0000000000000000

# --- JekyllFaces Metadata ---

version:   0.1.0
github:    https://github.com/groundh0g/jekyllfaces
website:   http://jekyllfaces.com/
bsversion: 4.1.0

---
# Config File

This markdown should never be displayed. This text is to satisfy the linters.