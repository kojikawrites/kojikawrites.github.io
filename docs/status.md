---
layout: page
title: Status
---

{% include read-config.liquid %}

{% assign currentTheme = config.customize.theme | default: "default" | upcase %}
{% assign cfg_issues = 0 %}
{% capture issues %}
<ul>
{% unless config.customize.http404 %}{% assign cfg_issues = cfg_issues | plus: 1 %}<li>WARNING: No 404 page specified. Using default 404 text.</li>{% endunless %}
{% unless config.analytics.provider %}{% assign cfg_issues = cfg_issues | plus: 1 %}<li>WARNING: No analytics provider specified.</li>{% endunless %}
{% unless config.comments.provider %}{% assign cfg_issues = cfg_issues | plus: 1 %}<li>WARNING: No comments provider specified.</li>{% endunless %}
</ul>
{% endcapture %}

<h1><a href="{{ config.website }}" target="_blank">JekyllFaces <small>v{{ config.version }}</small></a></h1>
<ul>
<li><a href="https://getbootstrap.com/" target="_blank">Bootstrap v{{ config.bsversion }}</a></li>
<li><a href="https://bootswatch.com/" target="_blank">Bootswatch v{{ config.bsversion }}</a></li>
<li><a href="{{ config.github }}" target="_blank">Source on GitHub</a></li>
</ul>

{% if cfg_issues == 0 %}There were no issues found.{% else %}There {% case cfg_issues %}{% when 1 %}was 1 issue{% else %}were {{cfg_issues}} issues{% endcase %} found.<br/>{{ issues }}{% endif %}
