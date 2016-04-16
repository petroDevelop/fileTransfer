/**
 * Created by Administrator on 2016/4/15.
 */
var serverUrl="http://localhost:8080/fileReceiver/";
var userKey="";
var userId="0";
var db;
var needle = require('needle');
function initDB(){
    var dbName="fileTransfer";
    var dbVersion = 1;
    var store;
    var request = window.indexedDB.open(dbName, dbVersion);
    request.onsuccess = function (event) {
        console.log("Success creating/accessing IndexedDB database");
        db =event.target.result; //request.result;
        //读取远程服务器地址
        getAll("user",handleUserData);
        //若没有则插入一条记录
    };
    request.onerror=function(event){
        console.log("Error creating/accessing IndexedDB database");
    };
    request.onupgradeneeded=function(event){
        db=event.target.result;
        if(!db.objectStoreNames.contains('user')){
            //key,name,username,initTime，maxFileSize（M）,maxThread,serverUrl，tempWorkDir
            store=db.createObjectStore('user',{keyPath:"id"});
            store.createIndex('nameIndex','name',{unique:true});
        }
        if(!db.objectStoreNames.contains('file')){
            //key,name,path,size,splitStartNum,splitEndNum,status(split,upload,finish),md5,dateCreated,lastUpdated,projectId,projectName,rigName
            store=db.createObjectStore('file',{autoIncrement: true});
            store.createIndex('nameIndex','name',{unique:false});
        }
        if(!db.objectStoreNames.contains('block')){
            //key,name,index,fileKey,path,size,status(split,upload,finish),md5,dateCreated,lastUpdated
            store=db.createObjectStore('block',{autoIncrement: true});
            store.createIndex('nameIndex','name',{unique:false});
        }
        console.log('DB version changed to '+dbVersion);
    };


}
function deleteDB(){
    var dbName="fileTransfer";
    window.indexedDB.deleteDatabase(dbName);
}
function getAll(table,callbackFunc){
    // 通过IDBDatabase得到IDBTransaction
    var transaction = db.transaction(table);
    // 通过IDBTransaction得到IDBObjectStore
    var objectStore = transaction.objectStore(table);
    // 打开游标，遍历customers中所有数据
    var data = new Array();
    objectStore.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
            var key = cursor.key;
            var rowData = cursor.value;
            rowData.key=key;
            //var jsonStr = JSON.stringify(cursor.value);
            cursor.continue();
            data.push(rowData);
        }else{
            callbackFunc(table,data);
        }
    }
}
function handleUserData(table,data){
    if(data.length>0){
        userId=data[0].id;
        userKey=data[0].key;
        serverUrl=data[0].serverUrl;
        if(userId!=="0"){
            window.location.href="index.html";
        }
    }else{
        var newData={
            id:"0",
            maxFileSize:1,
            maxThread:5,
            initTime:new Date().toDateString(),
            serverUrl:serverUrl
        }
        db.transaction(table,'readwrite').objectStore(table).put(newData);
    }
}
function updateDbServerUrl(table,key){
    var transaction=db.transaction(table,'readwrite');
    var store=transaction.objectStore(table);
    var request=store.get(key);
    request.onsuccess=function(e){
        var data=e.target.result;
        data.serverUrl=serverUrl;
        store.put(data);
    };
}
function insertData(table,data,callbackFunc){
    var request=db.transaction(table,'readwrite').objectStore(table).put(data);
    request.onsuccess=function(e){
        callbackFunc();
    };
}
function deleteDataByKey(table,key){
    var transaction=db.transaction(table,'readwrite');
    var store=transaction.objectStore(table);
    store.delete(key);
}


function changeServerUrl(){
    var name=prompt("请设置服务器地:",serverUrl);
    if (name!=null && name!="" && name!==serverUrl) {
        serverUrl=name;
        updateDbServerUrl("user",userKey);
    }
}
function login(){
    var username=$('#username').val();
    var password=$('#password').val();
/*    needle.post('http://localhost:8080/MDSRealrig', 'foo=bar', {}, function(err, resp) {
        console.log(resp.cookies);
    });*/


    needle.post(serverUrl+'login/clientLogin', "username="+username+"&password="+password, {}, function(err, resp) {
        // you can pass params as a string or as an object.
        if (!err && resp.statusCode == 200){
            //console.log(resp.body);
            var json=resp.body;
            if(json.result){
                if(userId==="0"){
                    //@todo
                    deleteDataByKey("user",userKey);
                    var newData={
                        id:json.id,
                        username:json.username,
                        name:json.name,
                        maxFileSize:1,
                        maxThread:5,
                        initTime:new Date().toDateString(),
                        serverUrl:serverUrl
                    }
                    insertData("user",newData,function(){
                        window.location.href="index.html";
                    });
                }
            }else{
                console.log(resp.body);
            }
        }

    });
}