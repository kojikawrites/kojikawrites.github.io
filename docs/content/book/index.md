---
---
# {{ page.dir }}

{% assign pd = page.dir %}

{% assign xyz = site.pages | where_exp: "page", "page.dir contains pd" | group_by: "dir" | first %}

{% for x in xyz.items %}

  * {{ x.title | markdownify }}

{% endfor %}