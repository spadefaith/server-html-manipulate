const cheerio = require('cheerio');
const fs = require('fs'); 
let _uiid = 0;
let _storage = {};
let $ = null;
module.exports = function (path, callback){
    let p = path+'/index-orig.html';
    fs.readFile(p, 'utf8', function(err, data) {
        if (err) throw err;
        $ = cheerio.load(data);
        // TODO: make modifications here
        let fors = $('[data-for]');
        let animate = $('[data-animate]');
        let switchs = $('[data-switch]');
        let binds = $('[data-bind]');
        let ifs = $('[data-if]');
        let cls = $('[data-class]');
        let forUpdate = $('[data-for-update]');
        let toggles = $('[data-toggle]');
        let events = $('[data-event]');
        // console.log(cls.length)

        _compileClass(cls); 
        _compileIf(ifs);
        _compileAnimate(animate);
        _compileBind(binds);
        _compileSwitch(switchs);
        _compileForUpdate(forUpdate);
        _compileFor(fors);
        _compileToggle(toggles);
        _compileEvents(events);

        // console.log(_storage);
        _createFile(path, $.html());
        callback(_storage);
    });
};

function _createFile(path, content){
    fs.writeFile(path+'/index.html', content, function(err){
        if (err){
            console.log(err);
        }
    })
};

function _addAttr(el, attr, add){
    // console.log(attr);
    let cached = el.attribs[attr];
    if (cached){
        $(el).attr(attr, cached+" "+add);
    } else {
        $(el).attr(attr, add);
    }
};

function _replaceAttr(el, attr, replace){
    $(el).attr(attr, replace);
};

function _register(store, s, obj){
    switch(true){
        case (!store[s]):{store[s] = []};
        default:{store[s].push(obj)};
        break;
    };
};

function _compileClass(els){
    if (!els.length){;return;}
    for (let s = 0; s < els.length; s++){
        let id = `cc${_uiid}`;
        let el = els[s];
        // console.log(el);
        let cl = el.attribs['data-class'];
        // console.log(cl);
        let [test, className] = cl.split('&&');
        test = test.trim();
        let [bind, ops, testVal] = test.split(" ");
        let hasNegate = bind.substring(0,1);
        hasNegate && (bind = bind.slice(1));
        _register(_storage, 'class', {hasNegate, bind, testVal,className, ops, sel:id});
        // console.log(_storage);
        _uiid++;
        _replaceAttr(el, 'data-class', id);
    };
};

function _compileIf(els){
    if (!els.length){res();return;}
    for (let s = 0; s < els.length; s++){
        let id = `ci${_uiid}`;
        let el = els[s];
        let _if = el.attribs['data-if'];
        let gr = _if.split(',');
        for (let g = 0; g < gr.length; g++){
            let val = gr[g].split(" ").join("");
            
            let [attr, exp] = val.split('=');
            exp = exp.split(new RegExp('[()]')).join("");

            let [test, r] = exp.split('?');
            let [bind, testval] = test.split(new RegExp('<|>|===|==|!==|!='))

            let [_true, _false] = r.split(':');

            _register(_storage, 'if', {attr, bind, testval:testval || null, _true, _false, sel:id});
        }
        _uiid++;
        _replaceAttr(el, 'data-if', id);
    };
};

function _compileAnimate(els){
    if (!els.length){;return;}

        
    for (let s = 0; s < els.length; s++){
        let id = `cka${_uiid}`;
        let el = els[s];
        let anim = el.attribs['data-animate'];
        anim = anim.split(" ").join("");
        //to handle multiple attr binding;
        //render:appead-slideInUp, remove:disappear
        let o = {};
        let split = anim.split(',');
        for (let a = 0; a < split.length; a++){
            let item = split[a];
            let [ctx, anims] = item.split(':');
            if (ctx == 'ns'){
                o.ns = anims;
                break;
            } else {
                o[ctx] = {keyframes:anims.split('-')};
            };
        };
        o.selector = {attr:'data-animate', val:id};
        _register(_storage, 'animate', o);
        _uiid++;

        _replaceAttr(el, 'data-animate', id);
    };
};

function _compileBind(els){
    if (!els.length){res();return;}
    for (let s = 0; s < els.length; s++){
        let id = `ckm${_uiid}`;
        let el = els[s];
        let model = el.attribs['data-bind'];
        // console.log(el)
        let gr = model.split(',');
        for (let g = 0; g < gr.length; g++){
            let val = gr[g].split(" ").join("");
            if (val.includes(':')){
                var [attr, bind] = val.split(":");
            } else {
                var bind = val;
                var attr = 'value';
            };
            _register(_storage,  'bind', {attr, bind, sel:id});
        }
        _uiid++;
        _replaceAttr(el, 'data-bind', id);
    };
};

function _compileSwitch(els){
    if (!els.length){res();return;}
    for (let s = 0; s < els.length; s++){
        let id = `cks${_uiid}`;
        let el = els[s];

        let bind = el.attribs['data-switch'], map='def';
        if (bind.includes('.')){
            var [f, ...rest] = el.attribs['data-switch'].split('.');
            bind = f;
            map = rest[0];
        };


        _addAttr(el, 'class', 'cake-template');
        _replaceAttr(el, 'data-switch', id);
        _uiid++;
        let children = el.children;
        let casesId = [];
        for (let c = 0; c < children.length; c++){
            let child = children[c];

            if (child.attribs && child.attribs['data-case']){
                let caseBind = child.attribs['data-case'];
                let _id = `cksc${_uiid}`;
                _uiid++;
                _replaceAttr(child, 'data-case', `${id}-${_id}`);
                casesId.push({_id, bind:caseBind});

            };
        };

        _register(_storage, 'switch', {bind, sel:id, map, cases:casesId});
       
    };
};

function _compileForUpdate(els){
    if (!els.length){return;}
    for (let f = 0; f < els.length; f++){
        let id = `ckfu${_uiid}`;
        let el = els[f];
        let fr = el.attribs['data-for-update'];
        _addAttr(el, 'style', 'display:none');
        _addAttr(el, 'class', 'cake-template');
        _replaceAttr(el, 'data-for-update', id);
        if (!el.attribs['data-for']){
            _addAttr(el, 'data-for-template', id);
        };
        let [a, b, c] = fr.split(" ");
        _register(_storage, 'forUpdate', {bind:c, sel:id, iter:a,ins: b});
        _uiid++;
    };
};

function _compileFor(els){
    if (!els.length){return;}
    let o = {};
    for (let f = 0; f < els.length; f++){
        let id = `ckf${_uiid}`;
        let el = els[f];
        let fr = el.attribs['data-for'];
        let [a, b, c] = fr.split(" ");

        _addAttr(el, 'style', 'display:none');
        _addAttr(el, 'class', 'cake-template');
        _replaceAttr(el, 'data-for', id);
        _replaceAttr(el, 'data-for-template', id);

        _register(_storage, 'for', {bind:c, sel:id, iter:a, ins: b});
        ++_uiid;
    };
};

function _compileToggle(els){
    if (!els.length){return;}
    let c = {};
    for(let t = 0; t < els.length; t++){
        let id = `ckt${_uiid}`;
        let el = els[t];
        let ns = el.attribs['data-toggle'];
        if (c[ns]){
            id = c[ns];
        };
        _replaceAttr(el, 'data-toggle', id);
        _register(_storage,  'toggle', {sel:id, name:'ns-'+ns});
        _uiid++;
        c[ns] = id;
    };
    c = {};
};

function _compileEvents(els){
    if (!els.length){return;}
    for (let e = 0; e < els.length; e++){
        let id = `cke${_uiid}`;
        let el = els[e];
        let event = el.attribs['data-event'];
        let splitted = event.split(" ").join("").split(',');
        for (let s = 0; s < splitted.length ; s++){
            let [event, cb] = splitted[s].split(':');
            cb = cb || event;
            _replaceAttr(el, 'data-event', id);
            _register(_storage, 'event', {event, sel:id, cb});
            _uiid++;
        }
    };
};