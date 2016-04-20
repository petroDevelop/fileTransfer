/**
 * Created by Administrator on 2016/4/15.
 */
var serverUrl="http://localhost:8080/fileReceiver/";
var userKey="";
var userId="0";
var username="";
var maxFileSize=1;
var maxThread=5;
var tempWorkDir="";
var db;

var fs = require('fs');
var needle = require('needle');
var async = require('async');
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
            //key,name（登录名）,username(真实姓名),initTime，maxFileSize（M）,maxThread,serverUrl，tempWorkDir
            store=db.createObjectStore('user',{keyPath:"id"});
            store.createIndex('nameIndex','name',{unique:true});
        }
        if(!db.objectStoreNames.contains('file')){
            //serverId,key,name,path,size,splitStartNum,splitEndNum,status(split,upload,finish),md5,dateCreated,lastUpdated,projectId,projectName,rigName
            store=db.createObjectStore('file',{autoIncrement: true});
            store.createIndex('nameIndex','name',{unique:false});
        }
        if(!db.objectStoreNames.contains('block')){
            //key,name,splitNum,fileKey,path,size,status(split,upload,finish),md5,dateCreated,lastUpdated
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
        username=data[0].username;
        serverUrl=data[0].serverUrl;
        maxFileSize=data[0].maxFileSize;
        maxThread=data[0].maxThread;
        tempWorkDir=data[0].tempWorkDir+"/";
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
function handleFileData(table,data){
    var fileNum=0;
    if(data.length>0){
        for(var i=0;i<data.length;i++){
            if(data[i].status==="finish"){
                $('#fileHistoryTable').DataTable().row.add(data[i]).draw();
            }else{
                fileNum++;
                $('#fileTable').DataTable().row.add(data[i]).draw();
            }
        }
    }
    if(fileNum>0){
        $('#useLink').click();
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
function deleteDataByKey(table,key,callbackFunc){
    var transaction=db.transaction(table,'readwrite');
    var store=transaction.objectStore(table);
    var request=store.delete(key);
    request.onsuccess = function (event) {
        callbackFunc();
    }
}
function getUserInfo(){
    var dbName="fileTransfer";
    var dbVersion = 1;
    var store;
    var request = window.indexedDB.open(dbName, dbVersion);
    request.onsuccess = function (event) {
        console.log("Success creating/accessing IndexedDB database");
        db =event.target.result;  ;
        var transaction = db.transaction("user");
        var objectStore = transaction.objectStore("user");
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
                userId=data[0].id;
                userKey=data[0].key;
                username=data[0].username;
                serverUrl=data[0].serverUrl;
                maxFileSize=data[0].maxFileSize;
                maxThread=data[0].maxThread;
                tempWorkDir=data[0].tempWorkDir+"/";
                $('#usernameDiv').val(username);
                $('#serverUrl').val(serverUrl);
                $('#maxFileSize').val(maxFileSize);
                $('#maxThread').val(maxThread);
                $('#tempWorkDir').val(tempWorkDir);
                needle.post(serverUrl+"microseism/catchProjects", 'id='+userId, {}, function(err, resp) {
                    var json=resp.body;
                    if(json == null)return;
                    for(key in json)
                    {
                        var project = json[key];
                        var child = "<option value='"+ project.id +"' data-id='" + project.id + "' data-name='" + project.name + "' data-rigName='" + project.rigName+"'>" +  project.name + "</option>";
                        $("#projectSelect").append(child);
                    }
                    // $('.selectpicker').selectpicker('refresh');
                    if($(".select").length > 0){
                        $(".select").selectpicker({dropupAuto:false,size:6});

                        $(".select").on("change", function(){
                            if($(this).val() == "" || null === $(this).val()){
                                if(!$(this).attr("multiple"))
                                    $(this).val("").find("option").removeAttr("selected").prop("selected",false);
                            }else{
                                $(this).find("option[value="+$(this).val()+"]").attr("selected",true);
                            }
                        });
                    }
                });
                getAll("file",handleFileData);
            }
        }
    };
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
    //@todo cookie
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
                    deleteDataByKey("user",userKey,function(){
                        var newData={
                            id:json.id,
                            username:json.username,
                            name:json.name,
                            maxFileSize:1,
                            maxThread:5,
                            initTime:new Date().toDateString(),
                            serverUrl:serverUrl,
                            tempWorkDir:nw.App.dataPath
                        }
                        insertData("user",newData,function(){
                            window.location.href="index.html";
                        });
                    });

                }
            }else{
                console.log(resp.body);
            }
        }

    });
}
function addFileData(data,callback){
    var transaction=db.transaction('file','readwrite');
    var store=transaction.objectStore('file');
    var objectStoreRequest = store.add(data);
    objectStoreRequest.onsuccess = function(e1) {
        var key=e1.target.result;
        callback(data,key);
    }
    /*
    var dbName="fileTransfer";
    var dbVersion = 1;
    //var db;
    var store;
    var request = window.indexedDB.open(dbName, dbVersion);
    request.onsuccess = function (event) {
        db = request.result;
        var transaction=db.transaction('file','readwrite');
        var store=transaction.objectStore('file');
        var objectStoreRequest = store.add(data);
        objectStoreRequest.onsuccess = function(e1) {
            var key=e1.target.result;
            callback(data,key);
            //return fileId; //id
        }
    };
    request.onerror=function(event){
        console.log("Error creating/accessing IndexedDB database");
    };
    request.onupgradeneeded=function(event){
        console.log('DB version changed to '+dbVersion);
    };
    */

}
function dropOneFile(key){
    var transaction=db.transaction('file','readwrite');
    var store=transaction.objectStore('file');
    var request =store.delete(parseInt(key));
    request.onsuccess = function (event) {
        console.log("dropOneFile sucess="+key);
    }
}

function beginTransFer(){
    //table内的文件
        //切分 存入block
        //将此文件信息发送至服务器
        //开始 发送小文件 //成功后，更新本地block表
        //发送合并请求
        //更改文件状态
    var table=$("#fileTable").DataTable();
    var data=table.data();
    var finishNum=0;
    data.each( function (d) {
        if(d.status==""){
            splitFile(d,function(){
                //@todo 计算 是否全部完成
                finishNum++;
                if(finishNum==data.length){
                    //@ todo
                    uploadFiles(data);
                }
            });
        }
    } );
    data.each( function (d) {
        d.status="split";
        //@todo 更新数据库
    } );
    table.clear().draw();
    data.each(function (d) {
        $('#fileTable').DataTable().row.add(d).draw();
    } );

}
function uploadFiles(data){
    var index=0;
    uploadFile(index,data,finishOneFile);
}
/**
 * 上传文件，先向服务器端申请fileid
 * @param index
 * @param data
 * @param callbackFunc
 */
function uploadFile(index,data,callbackFunc){
    var one=data[index];
    ////params（name,projectId,path,size,splitStartNum,splitEndNum,md5）
    var fileParam = {name:one.name,projectId:one.projectId,path:one.path,size:one.realsize,splitStartNum:one.splitStartNum,splitEndNum:one.splitEndNum,md5:one.md5};
    needle.post(serverUrl+"microseism/addOneFile", fileParam, {}, function(err, resp) {
        if(!err && resp.statusCode == 200)
        {
            var json = resp.body;
            if (json == null)return;
            if(json.result != true)return;
            one.serverId = json.id;
            startUploadBlock(index,data,callbackFunc)
        }

    });
}
function startUploadBlock(index,data,callbackFunc)
{
    var one=data[index];
    /**
     * 定义一个queue，设worker数量
     */
    var q = async.queue(function(task, callback) {
        //console.log('worker is processing task: ', task.name);
        task.run(callback);
    }, maxThread);
    // q.saturated = function() {
    //     //console.log('all workers to be used');
    // }
    // q.empty = function() {
    //     //console.log('no more tasks waiting');
    // }
    // q.drain = function() {
    //     //console.log('all tasks have been processed');
    //     //@todo 修改 @ finish 文件状态
    //     // 清除temp
    //     callbackFunc(index,data);
    // }
    // var array=[];
    //@todo one 读取 block 地址
    var uploaderror = function(err){
        console.log('error:',err);
    }
    for (var i = one.splitStartNum;i<=one.splitEndNum;i++)
    {
        q.push(
            {
                name:one.name+'.'+i, run: function(cb){

                //task -- block
                //needle post
                //@todo block 状态 //db状态
                //params（name,fileId,splitNum,path,size,splitStartNum,splitEndNum,md5，uploadFile（二进制文件））
                // var fileParam = {name:one.name,fileId:one.serverId,path:one.path,size:one.realsize,splitStartNum:one.splitStartNum,splitEndNum:one.splitEndNum,md5:one.md5};
                // needle.post(serverUrl+"microseism/uploadOneBlock", fileParam, {}, function(err, resp) {
                //     if(!err && resp.statusCode == 200)
                //     {
                //         var json = resp.body;
                //         if (json == null)return;
                //         if(json.result != true)return;
                //         one.serverId = json.id;
                //         startUploadBlock(index,data,callbackFunc)
                //     }
                //
                // });
            }
            }
        , function(err) {
            //console.log('err: ',err);
        });
    }

}
function finishOneFile(index,data){
    index++;
    if(index<data.length){
        uploadFile(index,data,finishOneFile);
    }else{
        //todo 表格状态文件更改

    }
}
function splitFile(data,callbackFunc){
    var len = 0;
    var fileSplitIndex=0;
    fs.createReadStream(data.path)
        .on('data',function(chunk){
            len+=chunk.length;
            if(len<1024*1024*maxFileSize){

            }else{
                //存入block
                //params key,name,splitNum,fileKey,path,size,status(split,upload,finish),md5,dateCreated,lastUpdated
                var blockData={
                    "name":data.name+"."+fileSplitIndex,
                    "splitNum":fileSplitIndex,
                    "fileKey":data.key,
                    "path": tempWorkDir+"fileFolder/"+data.name+"."+fileSplitIndex,
                    "size": len,
                    "status": 'split',
                    "dateCreated": new Date(),
                    "lastUpdated": new Date()
                }
                addBlockData(blockData,function(data,key){
                    data.key=key;
                });

                len=0;
                fileSplitIndex++;
            }
            if(!fs.existsSync(tempWorkDir+"fileFolder/")){
                fs.mkdirSync(tempWorkDir+"fileFolder/");
            }
            fs.appendFileSync(tempWorkDir+"fileFolder/"+data.name+"."+fileSplitIndex,chunk);
        })
        .on("end", function () {
            //
            data.splitStartNum=0;
            data.splitEndNum=fileSplitIndex;
            //@todo file db 同步
            //@todo 切分 存入block //上传
            //params key,name,splitNum,fileKey,path,size,status(split,upload,finish),md5,dateCreated,lastUpdated
            // var blockData={
            //     "name":data.name+"."+fileSplitIndex,
            //     "splitNum":fileSplitIndex,
            //     "fileKey":data.key,
            //     "path": tempWorkDir+"fileFolder/"+data.name+"."+fileSplitIndex,
            //     "size": chunk.length,
            //     "status": 'split',
            //     "dateCreated": new Date(),
            //     "lastUpdated": new Date()
            // }
            // addBlockData(blockData,function(data,key){
            //     data.key=key;
            // });
            callbackFunc();
        });
}

function addBlockData(data,callback){
    var transaction=db.transaction('block','readwrite');
    var store=transaction.objectStore('block');
    var objectStoreRequest = store.add(data);
    objectStoreRequest.onsuccess = function(e1) {
        var key=e1.target.result;
        callback(data,key);
    }
    /*
     var dbName="fileTransfer";
     var dbVersion = 1;
     //var db;
     var store;
     var request = window.indexedDB.open(dbName, dbVersion);
     request.onsuccess = function (event) {
     db = request.result;
     var transaction=db.transaction('file','readwrite');
     var store=transaction.objectStore('file');
     var objectStoreRequest = store.add(data);
     objectStoreRequest.onsuccess = function(e1) {
     var key=e1.target.result;
     callback(data,key);
     //return fileId; //id
     }
     };
     request.onerror=function(event){
     console.log("Error creating/accessing IndexedDB database");
     };
     request.onupgradeneeded=function(event){
     console.log('DB version changed to '+dbVersion);
     };
     */

}

function saveConfig(){

    if(window.confirm("请确认保存?")){
        username=$('#usernameDiv').val();
        serverUrl=$('#serverUrl').val();
        maxFileSize=$('#maxFileSize').val();
        maxThread=$('#maxThread').val();
        tempWorkDir=$('#tempWorkDir').val();
        var transaction=db.transaction("user",'readwrite');
        var store=transaction.objectStore("user");
        var request=store.get(userKey);
        request.onsuccess=function(e){
            var data=e.target.result;
            data.username=username;
            data.serverUrl=serverUrl;
            data.maxFileSize=maxFileSize;
            data.maxThread=maxThread;
            data.tempWorkDir=tempWorkDir;
            store.put(data);
            alert("配置保存成功!");
        };
    }


}
function showOneFile(dataKey){
    //@todo
}