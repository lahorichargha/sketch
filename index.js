var po = org.polymaps, map;


$.domReady(function() {
    map = po.map()
      .container(
        document.getElementById('map')
        .appendChild(po.svg('svg')))
      .center({lat: 0, lon: 0})
      .zoom(2)
      .zoomRange([0, 16])
      .add(po.image()
        .url(po.url(
            'http://a.tiles.mapbox.com/mapbox/2.0.0/world-glass/{Z}/{X}/{Y}.png')));

    var s = sketch({
        stroke: '#013f86'
    });
    var i = po.interact();
    map.add(s);

    $('#draw').click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        map.add(s);
        map.remove(i);
        $('a.button').removeClass('active');
        $(this).addClass('active');
    });

    $('#move').click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        map.remove(s);
        map.add(i);
        $('a.button').removeClass('active');
        $(this).addClass('active');
    });

    $('#geojson').click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        $('#geojson-output').show();
        $('#geojson-output').text(JSON.stringify(s.geojson(), null, 4));
    });
});
