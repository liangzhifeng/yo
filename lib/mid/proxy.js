/*!
 * yo
 * Copyright(c) 2015 Hbomb
 * MIT Licensed
 */

'use strict';

/**
 * 模块依赖
 * @private
 */
var debug = require('debug')('mid-proxy');
var request = require('request');
var _ = require('lodash');
var ret = {};
var count = 0;

/**
 * 接口代理中间件
 * @param  {Request} req 请求对象
 * @param  {Response} res 返回对象
 * @param  {Function} next 传递处理
 * @return {void}
 */
module.exports = function(req, res, next) {
  var input = req.input,
    apiNum = 1;

  ret = {};
  count = 0;

  if (!input) {
    next();
    return;
  }
  if (input.error) {
    next();
    return;
  }

  //接口传参
  var params = {
    domain: input.config.domain, //接口域名
    api: input.config, //接口配置
    params: input.params[0], //传参处理
    apiNum: apiNum, //接口数量
    next: next, //express next
    res: res //express 请求返回对象
  };

  //根据接口配置调用
  if (input.config.apis) {

    apiNum = input.config.apis.length;
    params.apiNum = apiNum;

    _.forEach(input.config.apis, function(v, k) {
      if (typeof v === 'object') {
        v.domain = v.domain ? v.domain : input.config.domain;
      }


      var p = _.clone(params);
      p.api = v;
      p.params = input.params[k];
      callApi(p);
    });
  } else {
    callApi(params);
  }
};

/**
 * 处理结果
 * @param  {Object} params 参数
 * @return {void}        无
 */
function procRet(params) {
  if (params.apiNum > 1) {
    ret[params.api.method + params.domain + params.api.url] = JSON.parse(params.body);
  } else {
    ret = JSON.parse(params.body);
  }
  params.res.proxyData = ret;
  count++;
  if (params.apiNum === count) {
    params.next();
  }
}


/**
 * 调用API
 * @param  {Object}   params  domain 域名
 * api 接口 params 传参  apiNum 接口数量
 * next触发函数   res    请求返回
 * @return {void}            无
 */
function callApi(params) {
  if (params.res.getCache) {

    var key = params.res.genKey(params.domain, params.api.url, JSON.stringify(params.params));

    params.res.getCache(key, function(err, body) {
      if (!err && body) {
        debug(key + ' cached!');
        params.body = body;
        procRet(params);
      } else {
        callServer(params);
        debug(key + '  cache expired!');
      }
    });
  } else {
    callServer(params);
  }
}

/**
 * 调用服务
 * @param  {Object}   params  传参
 * @return {void}       无
 */
function callServer(params) {
  request({
    url: params.domain + params.api.url,
    method: params.api.method,
    qs: params.params
  }, function(error, response, body) {
    if (response && response.statusCode === 200) {
      if (params.res.setCache) {
        var key = params.res.genKey(params.domain, params.api.url, JSON.stringify(params.params));

        params.res.setCache(key, body, params.api.cache);
      }
      params.body = body;
      procRet(params);
    } else {
      if (response) {
        params.next(new Error('error: ' + response.statusCode));
      } else {
        params.next(new Error('api server error!'));
      }
    }
  });
}