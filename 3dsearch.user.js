// ==UserScript==
// @copyright    Copyright IBM Corp. 2016
// @name         mindMap
// @version      0.9
// @description  *** PROTOTYPE CODE *** displays community list as cards with flip action for additional info
//
// @namespace  http://ibm.com
//
// @author
//
// @include      *://*connections*.ibm.com/communities/service/html/mycommunities
// @include      *://*connections*.ibm.com/communities/service/html/ownedcommunities
// @include      *://*connections*.ibm.com/communities/service/html/followedcommunities
// @include      *://*connections*.ibm.com/communities/service/html/communityinvites
// @include      *://*connections*.ibm.com/communities/service/html/allcommunities
// @include      *://*connections*.ibm.com/communities/service/html/trashedcommunities
//
// @include      *://apps.*.collabserv.com/communities/service/html/mycommunities
// @include      *://apps.*.collabserv.com/communities/service/html/ownedcommunities
// @include      *://apps.*.collabserv.com/communities/service/html/followedcommunities
// @include      *://apps.*.collabserv.com/communities/service/html/communityinvites
// @include      *://apps.*.collabserv.com/communities/service/html/allcommunities
// @include      *://apps.*.collabserv.com/communities/service/html/trashedcommunities

// @include      *://apps.*.collabserv.com/search/web/search
// @include      *://apps.*.collabserv.com/search/web/search*
//
// @include      *://w3alpha*.toronto.ca.ibm.com/*
//
// @exclude
//
// @run-at       document-end
//
// ==/UserScript==
if (typeof (dojo) != 'undefined') {
  var waitFor = function (callback, elXpath, maxInter, waitTime) {
    if (!maxInter) var maxInter = 20; // number of intervals before expiring
    if (!waitTime) var waitTime = 100; // 1000=1 second
    if (!elXpath) return;
    var waitInter = 0; // current interval
    var intId = setInterval(function () {
      if (++waitInter < maxInter && !dojo.query(elXpath).length) return;
      clearInterval(intId);
      callback();
    }, waitTime);
  };
  waitFor(function () {
    showTable = function () {
      var iframe = dojo.query('#contentContainer_results_View iframe')[0];
      if(iframe) iframe.style.display = 'none';
      var table = dojo.query('#contentContainer_results_View table')[1];
      table.style.display = '';
    };

    var searchResult = null;
    var screenSize = {width: 1000, height:1000};
    showMap = function() {
      var iframe = dojo.query('#contentContainer_results_View iframe')[0];
      if(!iframe) iframe = createMap();
      else {
          postMsg(searchResult);
      }
      iframe.style.display = '';
      var table = dojo.query('#contentContainer_results_View table')[1];
      var pos = dojo.position(table);
      table.style.display = 'none';
      iframe.style.width = pos.w + 'px';
      iframe.style.height = pos.h + 'px';
    };

    parseXml = function(xmlDom){
        var entrys = dojo.query('entry',xmlDom);
        var len = entrys.length;
        var files = [];
        var wiki = [];
        var activity = [];
        var forums = [];
        var bookmarks = [];
        var blog = [];
        var person = [];
        for(var i = 0; i < len; i++) {
            var entry = entrys[i];
            var item = {};

            item['title'] =  dojo.query('title', entry)[0].textContent.replace(/<b>/,'').replace(/<\/b>/,'');
            var updated = dojo.query('updated',entry)[0].textContent;
            if(!!updated) {
                item['updated'] = updated.substr(0,10);
            }
            item['author'] = dojo.query('author name', entry)[0].textContent;

            if(item['label'] === undefined) {
                item['label'] = item['title'];
            }

            item['href'] = '';
            var links = dojo.query('link',entry);
            item['href'] = links[0].getAttribute('href');
            item['self'] = links[1].getAttribute('href');
            item['id'] = dojo.query('id',entry)[0].textContent;
            item['relevance'] = dojo.query('score',entry)[0].textContent;

            if(dojo.query('communityUuid',entry)[0])
                item['commUuid'] = dojo.query('communityUuid',entry)[0].textContent;

            var docType = dojo.query('category[scheme="http://www.ibm.com/xmlns/prod/sn/doctype"]',entry)[0];
            var component = '';
            console.log(docType);

            switch(docType.getAttribute('term')) {
                case 'Document/File':
                    item['component'] = 'Files';
                    var extIndex = item['title'].lastIndexOf('.');
                    var ext = item['title'].substring(extIndex+1);
                    console.log(ext);
                    if(ext.startsWith('doc')) item['icon'] = 'doc_word.png';
                    else if(ext.startsWith('xls')) item['icon'] = 'doc_excel.png';
                    else  item['icon'] = 'doc_ppt.png';
                    files.push(item);
                    break;
                case 'Document/Wiki':
                    item['component'] = 'Wiki';
                    item['icon'] = 'wiki.png';
                    wiki.push(item);
                    break;
                case 'Document/ForumThread':
                    item['component'] = 'Forum';
                    item['icon'] = 'forum.png';
                    forums.push(item);
                    break;
                case 'Person':
                    item['component'] = 'Person';
                    item['icon'] = 'people.png';
                    person.push(item);
                    break;
                case 'Document/Bookmark':
                    item['component'] = 'Bookmarks';
                    item['icon'] = 'bookmark.png';
                    bookmarks.push(item);
                    break;
                case 'Document/Blog':
                    item['component'] = 'Blog';
                    item['icon'] = 'blog.png';
                    blog.push(item);
                    break;
                case 'Group/Activity':
                    item['component'] = 'Activity';
                    item['icon'] = 'activity.png';
                    activity.push(item);
                    break;
            }
        }
         var res = {};
        if(files.length > 0){
            res['Files'] = files;
        }
        if(wiki.length > 0){
            res['Wiki'] = wiki;
        }
        if(activity.length > 0){
            res['Activity'] = activity;
        }
        if(forums.length > 0){
            res['Forum'] = forums;
        }
        if(bookmarks.length > 0){
            res['Bookmarks'] = bookmarks;
        }
        if(blog.length > 0){
            res['Blog'] = blog;
        }
        if(person.length > 0){
            res['Person'] = person;
        }
        return res;
    };

    getSearchParam = function() {
        var query = location.search.substr(1);
        var params = {};
        query.split("&").forEach(function(part) {
            var item = part.split("=");
            params[item[0]] = decodeURIComponent(item[1]);
        });
        return params['query'];
    };



    postMsg = function(data) {
        var query = location.search.substr(1);
        var params = {};
        query.split("&").forEach(function(part) {
            var item = part.split("=");
            params[item[0]] = decodeURIComponent(item[1]);
        });
        var msg = {data:data, search: getSearchParam(), screenSize:screenSize};
        var iframe = dojo.query('iframe')[0];
        console.log('monkey : mindMap post message ' + msg);
        iframe.contentWindow.postMessage(JSON.stringify(msg),'*');
    };

    getSearchResult = function() {
        var query = getSearchParam();
        var xhrAgrs = {
            url: '/search/atom/mysearch',
            handleAs: 'xml',
            content: {
                query: query,
                pageSize: 50
            },
            load: function(data){
                //console.log('data is ' + data);
                var json = parseXml(data);
                searchResult = json;
                postMsg(json);
            },
            error: function(error){
                console.log('error is ' + error);
            }
        };
        dojo.xhrGet(xhrAgrs);
    };

    createMap = function() {
      var iframe = document.createElement('iframe');
      iframe.id = 'mindMap';
      iframe.src = 'http://localhost:3000/#/mindmap';
      //iframe.src = 'http://k8s.swg.usma.ibm.com:30099/#/map';
      iframe.style.width = '1000px';
      iframe.style.height = '1000px';
      iframe.style.display = 'none';
      iframe.frameBorder = '0';
      var table = dojo.query('#contentContainer_results_View table')[1];
      var pos = dojo.position(table);
      screenSize.width = pos.w;
      screenSize.height = pos.h;
      dojo.place(iframe,  table, 'after');
      getSearchResult();
      return iframe;
    };


    // grid vs list selector
    dojo.place('<div id="viewControl" class="lotusViewControl lotusRight">' +
    '<a id="viewControlTable" class="lotusSprite lotusView lotusDetailsOn" href="javascript:;" onclick="showTable();"><span class="lotusAltText ">Customizable</span></a>' +
    '<a id="viewControlTiles" class="lotusSprite lotusView lotusTileOff"  href="javascript:;" onclick="showMap();"><span class="lotusAltText lotusBold">List</span></a>' +
    '</div>', dojo.query('#contentContainer_results_View div.lotusHeader.lconnSearchResultsHeading') [0], 'append');
    createMap();
  }, '#contentContainer_results_View div.lotusHeader');
}
