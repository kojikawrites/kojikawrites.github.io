---
---

{% include read-config.liquid %}

{% assign defaultWebsite = config.metadata.title | default: "Example" | append: ".com" %}
{% assign theCompany = config.legal.company | default: config.metadata.title | default: "The Company" %}
{% assign theWebsite = config.legal.website | default: defaultWebsite | default: "The Website" %}

# Disclaimer

Last updated: {{ page.date | default: "now" | date: "%B %-d, %Y" }}

The information contained on {{ theWebsite }} (the "Service") is for general information purposes only. {{ theCompany }} assumes no responsibility for errors or omissions in the contents on the Service.

In no event shall {{ theCompany }} be liable for any special, direct, indirect, consequential, or incidental damages or any damages whatsoever, whether in an action of contract, negligence or other tort, arising out of or in connection with the use of the Service or the contents of the Service.

{{ theCompany }} reserves the right to make additions, deletions, or modification to the contents on the Service at any time without prior notice.

{{ theCompany }} does not warrant that the website is free of viruses or other harmful components.

## External Links

{{ theWebsite }} may contain links to external websites that are not provided or maintained by or in any way affiliated with {{ theCompany }}.

Please note that the {{ theCompany }} does not guarantee the accuracy, relevance, timeliness, or completeness of any information on these external websites.

## Fitness

This website offers health, fitness and nutritional information and is designed for educational purposes only. You should not rely on this information as a substitute for, nor does it replace, professional medical advice, diagnosis, or treatment.

## Affiliate Links

This affiliate disclosure details the affiliate relationships of {{ theCompany }} with other companies and products. Some of the links on {{ theWebsite }} are “affiliate links”, a link with a special tracking code.

----

*This text was created from a free template at [TermsFeed](https://termsfeed.com/){:target="_blank"}.*