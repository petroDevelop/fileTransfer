var serverUrl="http://219.141.214.13/fileReceiver/";
var userKey="0";
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
var allFileData;
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
        //console.log("Success creating/accessing IndexedDB database");
        db =event.target.result; //request.result;
        getAll("user",handleUserData);
    };
    request.onerror=function(event){
        //console.log("Error creating/accessing IndexedDB database");
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
            //store.createIndex('fileKeyIndex','fileKey',{unique:false});
        }
        showNotification("./package.nw/icons/car.png","提示","数据库新建成功");
        //console.log('DB version changed to '+dbVersion);
        setTimeout(function(){
            getAll("user",handleUserData);
        },700);
    };
}

function deleteDB(){
    var dbName="fileTransfer";
    db.close();
    window.indexedDB.deleteDatabase(dbName);
    initDB();
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
     win.setMinimumSize(1200, 800);
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
        //console.log("dropBlock sucess="+key);
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
        tempWorkDir=data[0].tempWorkDir;
        if(userId!=="0"){
            loginSuccess();
        }
    }else{
        var newData={
            id:"0",
            maxFileSize:1,
            maxThread:5,
            initTime:new Date().toDateString(),
            serverUrl:serverUrl,
            tempWorkDir:tempWorkDir
        }
        db.transaction(table,'readwrite').objectStore(table).put(newData);
    }
}
function handleFileData(table,data){
    var fileNum=0;
    if(data.length>0){
        for(var i=0;i<data.length;i++){
            if(data[i].status=="finish"){
                $('#fileHistoryTable').DataTable().row.add(data[i]).draw();
            }else{
                fileNum++;
                //console.log(data[i]);
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
        store.put(data,key);
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
    request.onerror=function(error){
        //console.log(error);
    }
}
function getUserInfo(){
    var dbName="fileTransfer";
    var dbVersion = 1;
    var store;
    var request = window.indexedDB.open(dbName, dbVersion);
    request.onsuccess = function (event) {
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
                $('#usernameDiv').html(username);
                serverUrl=data[0].serverUrl;
                maxFileSize=data[0].maxFileSize;
                maxThread=data[0].maxThread;
                tempWorkDir=data[0].tempWorkDir;
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

    try{
        needle.post(serverUrl+'login/clientLogin', "username="+username+"&password="+password, {}, function(err, resp) {
            // you can pass params as a string or as an object.
            if (!err && resp.statusCode == 200){
                //console.log(resp.body);
                var json=resp.body;
                //console.log(json);
                //showNotification("./package.nw/icons/camera.png","登录提示",json.result);
                if(json.result){
                    //showNotification("./package.nw/icons/camera.png","登录提示",userId);
                    if(userId=="0"){
                        //console.log("begin delete");
                        deleteDataByKey("user",userKey,function(){
                            //console.log("after delete ");
                            var newData={
                                id:json.id,
                                username:json.username,
                                name:json.name,
                                maxFileSize:1,
                                maxThread:5,
                                initTime:new Date().toDateString(),
                                serverUrl:serverUrl,
                                tempWorkDir:tempWorkDir
                            }
                            insertData("user",newData,function(){
                                //console.log("after insert ");
                                loginSuccess();
                            });
                        });

                    }
                }else{
                    showNotification("./package.nw/icons/camera.png","登录提示","用户名或密码不正确!");
                    //console.log(resp.body);
                }
            }else{
                showNotification("./package.nw/icons/camera.png","登录提示",err);
            }

        });
    }catch(error){
        showNotification("./package.nw/icons/camera.png","登录提示",error);
    }

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
        //console.log("dropOneFile sucess="+key);
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
    if(!fs.existsSync(tempWorkDir+"fileFolder/"+data.projectId+"/")){
        fs.mkdirSync(tempWorkDir+"fileFolder/"+data.projectId+"/");
    }
    if(fs.existsSync(tempWorkDir+"fileFolder/"+data.projectId+"/"+data.name+"/")){
        deleteFolderRecursive(tempWorkDir+"fileFolder/"+data.projectId+"/"+data.name+"/");
    }
    fs.mkdirSync(tempWorkDir+"fileFolder/"+data.projectId+"/"+data.name+"/");
    $('#tipSpan').html("切分文件:"+ data.name);
    fs.createReadStream(data.path)
        .on('data',function(chunk){
            len+=chunk.length;
            if(len<1024*1024*maxFileSize){

            }else{
                len=0;
                fileSplitIndex++;
            }
            fs.appendFileSync(tempWorkDir+"fileFolder/"+data.projectId+"/"+data.name+"/"+data.name+"."+fileSplitIndex,chunk);
        })
        .on("end", function () {
            for(var num=0;num<=fileSplitIndex;num++){
                if(fs.existsSync(tempWorkDir+"fileFolder/"+data.projectId+"/"+data.name+"/"+data.name+"."+num)){
                    var buf=fs.readFileSync(tempWorkDir+"fileFolder/"+data.projectId+"/"+data.name+"/"+data.name+"."+num);
                    var str=buf.toString("binary");
                    var crypto = require("crypto");
                    var md5str = crypto.createHash("md5").update(str).digest("hex");
                    var stat=fs.statSync(tempWorkDir+"fileFolder/"+data.projectId+"/"+data.name+"/"+data.name+"."+num);
                    var blockData={
                        "name":data.name+"."+num,
                        "splitNum":num,
                        "fileKey":data.key,
                        "path": tempWorkDir+"fileFolder/"+data.projectId+"/"+data.name+"/"+data.name+"."+num,
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
            data.isSplitOver=true;
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
            showNotification("./package.nw/icons/coffee.png","配置提示","配置保存成功!");
        };
    }


}

function showOneFile(dataKey){
    globalShowFileKey=dataKey;
    var percent=0;
    if(filesBlockNum[dataKey]==0){
        percent=100;
    }else{
        percent=parseInt(((filesBlockNum[dataKey]-filesRemain[dataKey])/filesBlockNum[dataKey])*100);
    }
    changeSeatPercent(dataKey,percent);
    $('#modalShowblock').modal('show');
}
function changeSeatPercent(key,num){
    if(key==globalShowFileKey){
        var oneBit=0;
        var tenBit=0;
        if(num>1){
            globalSeat.get(["1_1"]).status('unavailable');
        }
        for(var i=1;i<101;i++){
            if(i<90){
                oneBit=parseInt(((i+10)+"").substr(0,1));
                tenBit=parseInt(((i+10)+"").substr(1,2))+1;
            }else{
                oneBit=parseInt(((i+10)+"").substr(0,2));
                tenBit=parseInt(((i+10)+"").substr(2,3))+1;
            }
            if(i<=num){
                globalSeat.get([oneBit+"_"+tenBit]).status('unavailable');
            }else{

                globalSeat.get([oneBit+"_"+tenBit]).status('available');
            }
        }

    }

}
function beginTransFer(){
    var table=$("#fileTable").DataTable();
    var data=table.data();
    var needNum=0;
    data.each(function (d){
        if(d.status==""){
            needNum++;
        }
    });
    if(needNum==0){
        showNotification("./package.nw/icons/coffee.png","信息提示","请先选择文件目录!");
        return true;
    }
    $('#fileSimple').fileinput('disable');
    $("#fileUpload").attr("disabled","disabled");
    $('#message-box-success').show();
    for(var i=0;i<10;i++){
        setTimeout(function(){
            $('#layoutProgressBar').attr('aria-valuenow', i*10);
            $('#layoutProgressBar').css('width', i*10 + '%');
        }, i*2000);
    }

    if(!fs.existsSync(tempWorkDir+"fileFolder/")){
        fs.mkdirSync(tempWorkDir+"fileFolder/");
    }
    data.each( function (d) {
        if(d.status==""){
            d.isSplitOver=false;
            splitFile(d,function(){
                var allSplitOver=true;
                data.each(function (d){
                    if(!d.isSplitOver){
                        allSplitOver=false;
                    }
                });
                if(allSplitOver){
                    $('#tipSpan').html("全部切分完成");
                    uploadFiles(data);
                }

            });
        }else{
            d.isSplitOver=true;
        }
    });
    data.each( function (d) {
        if(d.status==""){
            d.status="split";
        }
    });
    table.clear().draw();
    data.each(function (d) {
        $('#fileTable').DataTable().row.add(d).draw();
    } );
}
function uploadFiles(fileData){
    fileData.each(function(d){
        $('#tipSpan').html("与服务器同步文件信息:"+ d.name);
        if(d.status=="split"){
            d.isUploadInit=false;
            uploadInitFile(d,beginUploadBlocks,fileData);
        }else{
            d.isUploadInit=true;
        }
    });
}
function uploadInitFile(data,callbackFunc,fileData){
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
                data.serverId = json.id;
                data.status = "upload"
                data.isUploadInit=true;
                $('#statusSpan'+data.key).html("upload");
                filesServerId[data.key]=data.serverId;
                updateDb("file",data.key,data);
                var allInitOver=true;
                fileData.each(function (d){
                    if(!d.isUploadInit){
                        allInitOver=false;
                    }
                });
                if(allInitOver){
                    $('#tipSpan').html("同步文件信息完成");
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
    $('#tipSpan').html("获取全部文件块任务");
    getAll("block",startUploadBlocks);
}
function startUploadBlocks(table,data){
    $('#tipSpan').html("开始上传文件块任务");
    allblocks=data;
    uploadBlockQueue();
}
function uploadBlockQueue(){
    $('#message-box-success').hide();
    allFileData=$("#fileTable").DataTable().data();
    if(allblocks.length>0){
        uploadOneBlock();
        /*
        for (var i = 0;i<maxThread;i++){
            setTimeout(function(){
                uploadOneBlock();
            },3);
        }
        */
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
                        //console.log('#progressBar'+ blockInfo.fileKey+" change to "+percent);
                        $('#progressBar'+ blockInfo.fileKey).attr('aria-valuenow', percent);
                        $('#progressBar'+ blockInfo.fileKey).css('width', percent + '%');
                        $('#progressBar'+ blockInfo.fileKey).html(percent+"%");
                        //console.log(all+"+"+remain+"="+percent);
                        changeSeatPercent(blockInfo.fileKey,percent);
                        //完成一个file的状态

                        if(filesRemain[blockInfo.fileKey]==0) {
                            allFileData.each(function(d){
                                if(d.key==blockInfo.fileKey){
                                    d.status = "finish";
                                }
                            });
                            updateDbWithCallback('file', blockInfo.fileKey, function (data) {
                                data.status = "finish";
                            });
                            $('#statusSpan' + blockInfo.fileKey).html("finish");
                            $('#progressBar'+ blockInfo.fileKey).attr('aria-valuenow', 100);
                            $('#progressBar'+ blockInfo.fileKey).css('width','100%');
                            $('#progressBar'+ blockInfo.fileKey).html("100%");
                            //needle.post(serverUrl+"microseism/finishOneFile", {fileId:fileParam.fileId}, {multipart: true}, function(err, resp) {});
                        }
                        uploadOneBlock();
                    }else{
                        //alert(json.error+json.message+fileParam.size);
                        //return;
                        //console.log(json);
                        showNotification("./package.nw/icons/car.png","错误提示","传输文件"+blockInfo.name+"时出错,错误为"+json.message);
                        allblocks.push(blockInfo);
                        uploadOneBlock();
                    }
                }else{
                    //console.log(err);
                    showNotification("./package.nw/icons/car.png","错误提示","传输文件"+blockInfo.name+"时出错,错误为"+err);
                    allblocks.push(blockInfo);
                    uploadOneBlock();
                }
            });
        }
    }else{
        //全部上传完毕
        $('#fileSimple').fileinput('enable');
        $("#fileUpload").removeAttr("disabled");
    }
}
function timeStamp2String(){
    var datetime = new Date();
    var year = datetime.getFullYear();
    var month = datetime.getMonth() + 1 < 10 ? "0" + (datetime.getMonth() + 1) : datetime.getMonth() + 1;
    var date = datetime.getDate() < 10 ? "0" + datetime.getDate() : datetime.getDate();
    var hour = datetime.getHours()< 10 ? "0" + datetime.getHours() : datetime.getHours();
    var minute = datetime.getMinutes()< 10 ? "0" + datetime.getMinutes() : datetime.getMinutes();
    var second = datetime.getSeconds()< 10 ? "0" + datetime.getSeconds() : datetime.getSeconds();
    return year + "-" + month + "-" + date+"["+hour+"h"+minute+"m]";
}

var showNotification = function (icon, title, body) {
    //var NW=require('nw.gui');
    if (icon && icon.match(/^\./)) {
        icon = icon.replace('.', 'file://' + process.cwd());
    }

    var notification = new Notification(title, {icon: icon, body: body});

    notification.onclick = function () {
       // writeLog("Notification clicked");
        //NW.Window.get().focus();
        gui.Window.get().focus();
    };

    notification.onclose = function () {
        //writeLog("Notification closed");
        //NW.Window.get().focus();
        gui.Window.get().focus();
    };

    notification.onshow = function () {
       // writeLog("-----<br>" + title);
    };

    return notification;
}
function setTempWorkDir(dir){
    //console.log("setting dir="+dir);
    tempWorkDir=dir;
}
function cleanDbAndReload(){
    var dbName="fileTransfer";
    db.close();
    window.indexedDB.deleteDatabase(dbName);
    var gui1 = require("nw.gui");
    gui1.App.quit();
}
