---
layout: page
showTitle: false
---

## Posts By Category

The following categories appear on this site:

{% for cat in site.categories %}
<span class="category-wrapper"><a class="category" href="#{{ cat[0] | slugify }}">{{ cat[0] }}</a></span>
{%- endfor %}
<hr/>

{% for category in site.categories %}
{% assign cat = category[0] %}

<div id="{{ cat | slugify }}" class="category-div">
<h3 name="{{ cat | slugify }}">{{ cat }}</h3>

<ul>
{% for post in site.categories[cat] %}
  <li><a href="{{ post.url }}">{{ post.title }}</a><br/>
    {{ post.excerpt }}
  </li>
{% endfor %}
</ul>

</div>

{% endfor %}

<script>
document.addEventListener('DOMContentLoaded', function() {

  function closeAllSections() {
    var contents = document.querySelectorAll('.category-div ul');
    contents.forEach(function(content) {
      content.style.display = 'none';
    });

    // Set all headers to inactive
    var headers = document.querySelectorAll('.category-div h3');
    headers.forEach(function(header) {
      header.classList.remove('category-header-active');
      header.classList.add('category-header-inactive');
    });
  }

  function openSection(id) {
    closeAllSections();
    var content = document.querySelector('#' + id + ' ul');
    var header = document.querySelector('#' + id + ' h3');
    if (content && header) {
      content.style.display = 'block';
      // Set the active header class
      header.classList.remove('category-header-inactive');
      header.classList.add('category-header-active');
    }
  }

  // Add click event listeners to all h3 headers
  var headers = document.querySelectorAll('.category-div h3');
  headers.forEach(function(header) {
    header.addEventListener('click', function() {
      var id = header.parentElement.id;
      openSection(id);
    });
  });

  // Function to open section based on hash or number of categories
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
      var categoryDivs = document.querySelectorAll('.category-div');
      if (categoryDivs.length === 1) {
        // If only one category, open it by default
        var id = categoryDivs[0].id;
        openSection(id);
      } else {
        // If multiple categories, close all sections
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

