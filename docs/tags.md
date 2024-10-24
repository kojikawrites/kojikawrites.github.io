---
layout: page
showTitle: false
---

## Posts By Tag

The following tags appear on this site:

{% assign sorted_tags = site.tags | sort %}

{% for tag in sorted_tags %}
<span class="tag-wrapper"><a class="tag" href="#{{ tag[0]  }}">#{{ tag[0] }}</a></span>
{%- endfor %}
<hr/>


{% for tg in sorted_tags %}
{% assign tag = tg[0] %}

<div id="{{ tag | slugify }}" class="tag-div">
<h3 class="tag-header-inactive" name="{{ tag | slugify }}">#{{ tag }}</h3>

<ul>
{% for post in site.tags[tag] %}
  <li><a href="{{ post.url }}">{{ post.title }}</a><br/>
    {{ post.excerpt }}
  </li>
{% endfor %}
</ul>

</div>

{% endfor %}

<!-- Add the following CSS to hide sections by default -->
<style>
.tag-div ul {
  display: none;
}
</style>

<!-- Add the following JavaScript to handle collapsing and expanding -->
<script>
document.addEventListener('DOMContentLoaded', function() {

function closeAllSections() {
  var contents = document.querySelectorAll('.tag-div ul');
  contents.forEach(function(content) {
    content.style.display = 'none';
  });

  // Set all headers to inactive
  var headers = document.querySelectorAll('.tag-div h3');
  headers.forEach(function(header) {
    header.classList.remove('tag-header-active');
    header.classList.add('tag-header-inactive');
  });
}

function openSection(id) {
  closeAllSections();
  var content = document.querySelector('#' + id + ' ul');
  var header = document.querySelector('#' + id + ' h3');
  if (content && header) {
    content.style.display = 'block';
    // Set the active header class
    header.classList.remove('tag-header-inactive');
    header.classList.add('tag-header-active');
  }
}

  // Add click event listeners to all h3 headers
  var headers = document.querySelectorAll('.tag-div h3');
  headers.forEach(function(header) {
    header.addEventListener('click', function() {
      var id = header.parentElement.id;
      openSection(id);
    });
  });

  // Function to open section based on hash
function handleHash() {
  if (window.location.hash) {
    var id = window.location.hash.substring(1);
    openSection(id);
    // Scroll to the section
    var elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView();
    }
  } else {
    var tagDivs = document.querySelectorAll('.tag-div');
    if (tagDivs.length === 1) {
      // If only one tag, open it by default
      var id = tagDivs[0].id;
      openSection(id);
    } else {
      // If multiple tags, close all sections
      closeAllSections();
    }
  }
}

  // On page load
  handleHash();

  // On hash change
  window.addEventListener('hashchange', handleHash);

});
</script>
