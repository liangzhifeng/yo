var _ = require('lodash');

/**
 * pjax插件
 * @param  {Request}
 * @param  {Response}
 * @param  {Function}
 * @return {[type]}
 */
module.exports = function pjax(req, res, next) {
    var accept = req.headers.accept || "",
        ret = {};
    if (!req.input || req.input.error) {
        if (~accept.indexOf("json")) {
            res.status(404).send(JSON.stringify({
                code: 404,
                message: req.input ? req.input.message : ''
            }));
        } else {
            res.locals = {
                reloadUrl: req.url
            };
            res.render('error/error');
        }
        return;
    }

    var defaultView = getView(req.input.config.route),
        view = req.input.config.view || defaultView;

    res.locals = res.proxyData;

    if (~accept.indexOf("json")) {
        res.send(JSON.stringify(res.proxyData));
    } else {
        if (req.headers['x-pjax']) {
            res.locals.layout = false;
        }
        res.render(view);
    }
}

/**
 * 得到默认的视图
 * @param  {[type]}
 * @return {[type]}
 */
function getView(route) {
    var defaultViewArr = route.split('/'),
        defaultView = [];

    _.forEach(defaultViewArr, function(val) {
        if (val.indexOf(':') < 0 && val !== '') {
            defaultView.push(val);
        }
    });

    if (defaultView.length < 2) {
        defaultView.push('default');
    }
    defaultView = defaultView.join('/');
    return defaultView;
}