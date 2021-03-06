import request from 'request';
import * as actionTypes from '../constants/actionTypes';
import { getAllInDB } from '../apis/db';

import insertProxyInDatabase from '../apis/db';

export const requestSearch = (searchType) => ({
  type: actionTypes.REQUEST_SEARCH,
  currentSearchType: searchType
});

export const searchStarted = () => ({
  type: actionTypes.SEARCH_STARTED,
  isSearching: true
});

export const searchFinished = () => ({
  type: actionTypes.SEARCH_FINISHED,
  isSearching: false
});

export const foundResult = (workingUrl) => ({
  type: actionTypes.FOUND_RESULT,
  result: workingUrl
});

export const stopSearching = () => ({
  type: actionTypes.STOP_SEARCHING
});


export const requestFullProxySearchDispatcher = (
  intervalGap, currentSearchType) => (dispatch, getState) => {
    dispatch(requestSearch(currentSearchType));
    const iter = new doFullSearch(intervalGap, dispatch, getState);
    iter.startSearching();
  };


function doFullSearch(intervalGap, dispatch, getState) {
  this.currentPosition = 0;
  this.elementsLength = 256;
  this.baseUrl = 'http://172.16.';
  this.interval = null;

  this.startSearching = function () {
    dispatch(searchStarted());
    this.currentPosition = 0;
    this.interval = setInterval(
      this.calc256.bind(this),
      intervalGap
    );
  }

  this.calc256 = function () {
    if (this.currentPosition > this.elementsLength) {
      dispatch(searchFinished());
      clearInterval(this.interval);
      return;
    };

    var n = this.currentPosition;

    for (var port of ['3128', '808', '8080']) {
      if (getState().main.isSearching === false) {
        dispatch(searchFinished());
        clearInterval(this.interval);
        return;
      }
      for (var i = 0; i < 256; i++) {
        var proxyUrl = this.baseUrl + this.currentPosition.toString() + '.' + i.toString() + ':' + port;
        var proxiedRequest = request.defaults({ proxy: proxyUrl });
        proxiedRequest.get('http://google.com', function (err, res) {
          if (checkSanityRes(res)) {
            let fullUrl = res.request.host + ':' + res.request.port;
            dispatch(foundResult(fullUrl));
            insertProxyInDatabase(fullUrl);
            console.log(fullUrl);
          }
        });
      }
    }
    console.log(this.currentPosition);
    this.currentPosition++;
  }
}


export const requestQuickProxySearchDispatcher = (currentSearchType) => (dispatch) => {
  dispatch(requestSearch(currentSearchType));
  getAllInDB()
    .then(res => res.map(item => 'http://' + item.url))
    .then(res => { doQuickSearch(res, dispatch) });
  //doQuickSearch(arrayProxyUrl, dispatch);
}

function doQuickSearch(arrayProxyUrl, dispatch) {
  dispatch(searchStarted());
  for (let url of arrayProxyUrl) {
    console.log(url);
    let proxiedRequest = request.defaults({ proxy: url });
    proxiedRequest.get('http://google.com', function (err, res) {
      console.log('res', res);
      if (checkSanityRes(res)) {
        //Proxy is working, dispatch action
        let fullUrl = res.request.host + ':' + res.request.port;
        dispatch(foundResult(fullUrl));
      }
    });
  }
  dispatch(searchFinished());
}


function checkSanityRes(res) {
  if (res && res.statusCode === 200 && res.body.substring(0, 300).indexOf('google') > 0)
    return true;
  return false;
}

export const stopSearchingDispatcher = () => (dispatch) => {
  dispatch(stopSearching());
}


/*************************************************************
*
*  UI Actions
*
*************************************************************/

export const toggleSelectedType = () => ({
  type: actionTypes.TOGGLE_SELECTED_TYPE
});
