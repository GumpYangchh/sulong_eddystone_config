var eddystone = {
    uuid: {
        scan:    "feaa",
        service: "ee0c2080-8786-40ba-ab96-99b91ac981d8",
        urldata: "ee0c2084-8786-40ba-ab96-99b91ac981d8",
    },
    scantime: 10,
};

var blegaptype = {
    0x01:   "flag",
    0x02:   "Incomplete list of 16-bit Service Class UUIDs",
    0x03:   "Complete list of 16-bit Service Class UUIDs",
    0x16:   "Service Data - 16-bit UUID",
};

var URLSchemePrefix = {
    0x00:   "http://www.",
    0x01:   "https://www.",
    0x02:   "http://",
    0x03:   "https://",
};

var URLSchemeExpansion = {
    0x00:   ".com/",
    0x01:   ".org/",
    0x02:   ".edu/",
    0x03:   ".net/",
    0x04:   ".info/",
    0x05:   ".biz/",
    0x06:   ".gov/",
    0x07:   ".com",
    0x08:   ".org",
    0x09:   ".edu",
    0x0a:   ".net",
    0x0b:   ".info",
    0x0c:   ".biz",
    0x0d:   ".gov",
};

var app = {
    deviceId: 0, 
    initialize: function() {
        this.bindEvents();
    },
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
    },
    blescan: function() {
        $('#devicelist').empty();
        ble.scan([eddystone.uuid.scan], eddystone.scantime, app.onDiscoverDevice, app.onDiscoverFail);
    },
    decodeURLData: function(data) {
        // console.log(data);
        var prefix = data[0];
        var urldata = URLSchemePrefix[prefix];
        for (var j=1; j<data.length; j++) {
            if (data[j] < 14) {
                urldata += URLSchemeExpansion[data[j]];
            } else {
                urldata += String.fromCharCode(data[j]);
            }
        }
        return urldata;
    },
    onDiscoverDevice: function(device) {
        //console.log(JSON.stringify(device));
        var adData = new Uint8Array(device.advertising);
        var adlen = adData.length;
        var html = '<li id=' + device.id + '>MAC:' + device.id + " RSSI:" + device.rssi + "<br/>";
        // console.log(adData.toString('hex') + " len=" + adlen);
        for (var i=0; i<adlen; ) {
            var len = adData[i];
            var type = adData[i+1];
            // console.log("len=" + len + " type=" + type);
            if (type === 0x00) {
                break;
            };
            // console.log(blegaptype[type]);
            if (type === 0x16) {
                var a = adData.slice(i+4, i+len+1);
                // console.log(a.toString('hex'));
                var frametype = a[0];
                if (frametype === 0x10) {
                    var txpower = a[1];
                    var urldata = app.decodeURLData(a.slice(2));
                    /*
                    var prefix = a[2];
                    urldata += URLSchemePrefix[prefix];
                    for (var j=3; j<a.length; j++) {
                        if (a[j] < 14) {
                            urldata += URLSchemeExpansion[a[j]];
                        } else {
                            urldata += String.fromCharCode(a[j]);
                        }
                    }
                    // console.log(urldata);
                    */
                    html += urldata;
                }
            }
            i += len + 1;
        }
        html += '</li>';
        $('#devicelist').append(html);
    },
    onDiscoverFail: function() {
        var html = '<li>No Scan EddyStone</a></li>';
        $('#devicelist').append(html);
    },
    connectid: function(deviceId){
        console.log("connect id=" + deviceId);
        onConnect = function() {
            app.deviceId = deviceId;
            console.log("connecting");
            ble.read(deviceId, eddystone.uuid.service, eddystone.uuid.urldata, app.onReadURLData, null);
            $.mobile.changePage('#page2');
            // app.connectstatus = "connecting";
        };
        ble.connect(deviceId, onConnect, app.onError);
    },
    disconnect: function() {
        ble.disconnect(app.deviceId, app.disconnectcall, app.onError);
        // app.connectstatus = "disconnect";
    },
    disconnectcall: function() {
        console.log("disconnect");
        app.blescan();
    },
    onError: function(reason) {
        if (reason != null) {
            alert("ERROR: " + reason); // real apps should use notification.alert
        }
    },
    onReadURLData: function(data) {
        var a = new Uint8Array(data);
        // console.log(a);
        var urldata = app.decodeURLData(a);
        $('#urldata').val(urldata);
    },
    onWriteURLData: function() {
        // console.log("write url data OK");
        app.disconnect();
    },
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        // console.log('Received Event: ' + id);
        // $('#devicelist').listview({countTheme:"a"});
        $('#devicelist').on('click', 'li', function(e) {
            var target = $(e.target);
            var deviceid = target.attr("id");
            // console.log("gump test " + deviceid);
            app.connectid(deviceid);
        });
        $('#ScanBtn').click(function() {
            app.blescan();
        });
        $('#settingbtn').click(function() {
            // console.log("gump test ok");
            var orgurl = $('#urldata').val();
            // console.log(orgurl);
            var len = orgurl.length;
            var buf = new Uint8Array(len);
            var i = 0;
            var endlen = 0;
            for (i=0; i<4; i++) {
                if (orgurl.indexOf(URLSchemePrefix[i]) === 0) {
                    break;
                }
            }
            if (i < 4) {
                buf[0] = i;
                endlen = 0;
                i = URLSchemePrefix[i].length;
                orgurl = orgurl.slice(i);
                while (orgurl.length > 0) {
                    // console.log(orgurl);
                    var j = 0;
                    var findoff = 0;
                    for (j=0; j<14; j++) {
                        findoff = orgurl.indexOf(URLSchemeExpansion[j]);
                        if (findoff > 0) {
                            break;
                        }
                    }
                    if (j<14) {
                        var temp = URLSchemeExpansion[j];
                        // console.log(findoff);
                        for (i=0; i<findoff; i++) {
                            endlen += 1;
                            buf[endlen] = orgurl.charCodeAt(i);
                        }
                        endlen += 1;
                        buf[endlen] = temp;
                        i += URLSchemeExpansion[j].length;
                        orgurl = orgurl.slice(i);
                    } else {
                        j = orgurl.length;
                        for (i=0; i<j; i++) {
                            endlen += 1;
                            buf[endlen] = orgurl.charCodeAt(i);
                        }
                        break;
                    }
                }
                endlen += 1;
                // buf.slice(0, endlen);
                // console.log("len=" + endlen + " " + buf);
            } else {
                alert("URL Encoder Error");
                app.disconnect();
            }
            if (endlen > 18) {
                alert("Encoder url too long (max 18 bytes)");
                app.disconnect();
            } else {
                var sendData = new Uint8Array(endlen);
                for (i=0; i<endlen; i++) {
                    sendData[i] = buf[i];
                }
                ble.write(app.deviceId, eddystone.uuid.service, eddystone.uuid.urldata, sendData.buffer, app.onWriteURLData, app.onError);
            }
        });
        /*
        $(document).on("pageshow", "#page1", function() {
            console.log("gump test " + app.connectstatus);
        });
        */
    }
};

app.initialize();
