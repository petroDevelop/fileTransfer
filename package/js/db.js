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
//文件名对应的block数目
var filesBlockNum={};
var filesServerId={};
//文件名对应的未完成block数目
var filesRemain={};
//全部文件块任务
var allblocks=[];

var globalSeat;
var globalShowFileKey;

var fs = require('fs');
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
            store=db.createObjectStore('q',{autoIncrement: true});
            store.createIndex('nameIndex','name',{unique:false});
            store.createIndex('fileKeyIndex','fileKey',{unique:false});
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
            if(table=='block'&& rowData.status=='finish'){

            }else{
                data.push(rowData);
            }

        }else{
            callbackFunc(table,data);
        }
    }
}
function loginSuccess(){
     var win=gui.Window.get();
     win.setMinimumSize(900, 750);
     win.setMaximumSize(1200, 800);
     win.setPosition('center');
     window.location.href="index.html";
}
function queryTable(range,callbackFunc) {
    var transaction = db.transaction("block");
    // 通过IDBTransaction得到IDBObjectStore
    var objectStore = transaction.objectStore("block");
    // 打开游标，遍历table中所有数据
    var index = objectStore.index("fileKeyIndex");
    var data = [];
    index.openCursor(range).onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
            var key = cursor.key;
            var rowData = cursor.value;
            rowData.key = key;
            //var jsonStr = JSON.stringify(cursor.value);
            cursor.continue();
            data.push(rowData);
        } else {
            callbackFunc(table, data);
        }
    }
}
function dropBlock(key){
    var transaction=db.transaction('block','readwrite');
    var store=transaction.objectStore('block');
    var request =store.delete(parseInt(key));
    request.onsuccess = function (event) {
        console.log("dropBlock sucess="+key);
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
            loginSuccess();
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
        store.update(data);
    };
}
function updateDb(table,key,data){
    var transaction=db.transaction(table,'readwrite');
    var store=transaction.objectStore(table);
    var request=store.put(data,key);
    request.onsuccess=function(e){
        //var data1=e.target.result;
        //store.put(data);
    };
}
function updateDbWithCallback(table,key,callback){
    var transaction=db.transaction(table,'readwrite');
    var store=transaction.objectStore(table);
    var request=store.get(key);
    request.onsuccess=function(e){
        var data=e.target.result;
        callback(data);
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
                           loginSuccess();
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
var deleteFolderRecursive = function(path) {
    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};
function splitFile(data,callbackFunc){
    var len = 0;
    var fileSplitIndex=0;
    if(fs.existsSync(tempWorkDir+"fileFolder/"+data.name+"/")){
        deleteFolderRecursive(tempWorkDir+"fileFolder/"+data.name+"/");
    }
    fs.mkdirSync(tempWorkDir+"fileFolder/"+data.name+"/");
    $('#tipSpan').html("切分文件:"+ data.name);
    fs.createReadStream(data.path)
        .on('data',function(chunk){
            len+=chunk.length;
            if(len<1024*1024*maxFileSize){

            }else{
                len=0;
                fileSplitIndex++;
            }
            fs.appendFileSync(tempWorkDir+"fileFolder/"+data.name+"/"+data.name+"."+fileSplitIndex,chunk);
        })
        .on("end", function () {
            for(var num=0;num<=fileSplitIndex;num++){
                if(fs.existsSync(tempWorkDir+"fileFolder/"+data.name+"/"+data.name+"."+num)){
                    var buf=fs.readFileSync(tempWorkDir+"fileFolder/"+data.name+"/"+data.name+"."+num);
                    var str=buf.toString("binary");
                    var crypto = require("crypto");
                    var md5str = crypto.createHash("md5").update(str).digest("hex");
                    var stat=fs.statSync(tempWorkDir+"fileFolder/"+data.name+"/"+data.name+"."+num);
                    var blockData={
                        "name":data.name+"."+num,
                        "splitNum":num,
                        "fileKey":data.key,
                        "path": tempWorkDir+"fileFolder/"+data.name+"/"+data.name+"."+num,
                        "size": stat.size,
                        "status": 'split',
                        "dateCreated": new Date(),
                        "lastUpdated": new Date(),
                        "md5":md5str,
                    }
                    addBlockData(blockData,function(key){});
                }
            }
            data.splitStartNum=0;
            data.splitEndNum=fileSplitIndex;
            filesBlockNum[data.key]=fileSplitIndex;
            filesRemain[data.key]=fileSplitIndex;
            data.status="split";
            var buf=fs.readFileSync(data.path);
            var str=buf.toString("binary");
            var crypto = require("crypto");
            data.md5=crypto.createHash("md5").update(str).digest("hex");
            updateDb("file",data.key,data);
            callbackFunc();
        });
}

function addBlockData(data,callback){
    var transaction=db.transaction('block','readwrite');
    var store=transaction.objectStore('block');
    var objectStoreRequest = store.add(data);
    objectStoreRequest.onsuccess = function(e1) {
        var key=e1.target.result;
        callback(key);
    }
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
    globalShowFileKey=dataKey;
    var percent=parseInt(((filesBlockNum[dataKey]-filesRemain[dataKey])/filesBlockNum[dataKey])*100);
    changeSeatPercent(dataKey,44);
    $('#modalShowblock').modal('show');
}
function changeSeatPercent(key,num){
    if(key==globalShowFileKey){
        for(var i=1;i<101;i++){
            if(i<=num){
                if(i<90){
                    globalSeat.get([((i+11)+"").substr(0,1)+"_"+((i+11)+"").substr(1,2)]).status('unavailable');
                }else{
                    globalSeat.get([((i+11)+"").substr(0,2)+"_"+((i+11)+"").substr(2,3)]).status('unavailable');
                }
            }
        }

    }

}
function beginTransFer(){
    $('#fileSimple').fileinput('disable');
    $("#fileUpload").attr("disabled","disabled");
    $('#message-box-success').show();
    for(var i=0;i<10;i++){
        setTimeout(function(){
            $('#layoutProgressBar').attr('aria-valuenow', i*10);
            $('#layoutProgressBar').css('width', i*10 + '%');
        }, i*1000);
    }
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
                finishNum++;
                if(finishNum==data.length){
                    uploadFiles(data);
                }
            });
        }else{
            finishNum++;
        }
    } );
    data.each( function (d) {
        if(d.status==""){
            d.status="split";
        }
    } );
    table.clear().draw();
    data.each(function (d) {
        $('#fileTable').DataTable().row.add(d).draw();
    } );
}
function uploadFiles(fileData){
    var uploadNeedNum=fileData.length;
    fileData.each(function (d) {
        if(d.status=="split"){
            uploadInitFile(d,beginUploadBlocks,uploadNeedNum);
        }else{
            uploadNeedNum--;
        }

    });
}
function uploadInitFile(data,callbackFunc,uploadNeedNum){
    ////params（name,projectId,path,size,splitStartNum,splitEndNum,md5）
    var fileParam = {
        name:data.name,projectId:data.projectId,path:data.path,size:data.realsize,
        splitStartNum:data.splitStartNum,splitEndNum:data.splitEndNum,md5:data.md5
    };
    needle.post(serverUrl+"microseism/addOneFile", fileParam, {}, function(err, resp) {
        if(!err && resp.statusCode == 200) {
            //console.log(resp.body);
            var json = resp.body;
            if(json.result){
                uploadNeedNum--;
                data.serverId = json.id;
                data.status = "upload";
                $('#statusSpan'+data.key).html("upload");
                filesServerId[data.key]=data.serverId;
                updateDb("file",data.key,data);
                if(uploadNeedNum==0){
                    callbackFunc();
                }
            }else{
                alert(json.message);
                $('#fileSimple').fileinput('enable');
                $("#fileUpload").removeAttr("disabled");
            }
        }

    });
}
function beginUploadBlocks(){
    getAll("block",startUploadBlocks);
}
function startUploadBlocks(table,data){
    allblocks=data;
    uploadBlockQueue();
}
function uploadBlockQueue(){
    $('#message-box-success').hide();
    if(allblocks.length>0){
        for (var i = 0;i<maxThread;i++){
            uploadOneBlock();
        }
    }else{
        //允许操作 按钮和选择框
        $('#fileSimple').fileinput('enable');
        $("#fileUpload").removeAttr("disabled");
    }
}
function uploadOneBlock(){
    if(allblocks.length>0){
        var blockInfo = allblocks.shift();//pop()
        if (blockInfo.status == "finish") {
            uploadOneBlock();
        }else{
            var fileParam = {name:encodeURI(blockInfo.name),fileId:filesServerId[blockInfo.fileKey],path:encodeURI(blockInfo.path),size:blockInfo.size,splitNum:blockInfo.splitNum,
                splitStartNum:0,splitEndNum:filesBlockNum[blockInfo.fileKey],md5:blockInfo.md5,uploadFile:{file:blockInfo.path,content_type:'image/png'}};
            blockInfo.status = "upload";
            updateDb('block',blockInfo.key,blockInfo);
            needle.post(serverUrl+"microseism/uploadOneBlockByQueue", fileParam, {multipart: true}, function(err, resp) {
                if(!err && resp.statusCode == 200) {
                    var json = resp.body;
                    if(json.result){
                        if(filesRemain[blockInfo.fileKey]>0) {
                            filesRemain[blockInfo.fileKey] = filesRemain[blockInfo.fileKey] - 1;
                        }
                        blockInfo.status = "finish";
                        updateDb('block',blockInfo.key,blockInfo);
                        //修改进度条，及百分比
                        var all=filesBlockNum[blockInfo.fileKey];
                        var remain=filesRemain[blockInfo.fileKey];
                        var percent=parseInt(((all-remain)/all)*100+"");
                        $('#progressBar'+ blockInfo.fileKey).attr('aria-valuenow', percent);
                        $('#progressBar'+ blockInfo.fileKey).css('width', percent + '%');
                        $('#progressBar'+ blockInfo.fileKey).html(percent+"%");
                        //console.log(all+"+"+remain+"="+percent);
                        changeSeatPercent(blockInfo.fileKey,percent);
                        //完成一个file的状态
                        if(filesRemain[blockInfo.fileKey]==0){
                            updateDbWithCallback('file',blockInfo.fileKey,function(data){
                                data.status = "finish";
                            });
                            $('#statusSpan'+data.key).html("finish");
                            needle.post(serverUrl+"microseism/finishOneFile", {fileId:fileParam.fileId}, {multipart: true}, function(err, resp) {

                            });
                        }
                        uploadOneBlock();
                    }else{
                        alert(json.error+json.message+fileParam.size);
                        //return;
                    };
                }
            });
        }
    }else{
        //全部上传完毕
        $('#fileSimple').fileinput('enable');
        $("#fileUpload").removeAttr("disabled");
    }
}
