/**
 * Created by Administrator on 2016/4/16.
 */
$(function() {
    $("#fileSimple").fileinput({
        showRemove:false,
        showPreview:false,
        showUpload: false,
        showCaption: false,
        browseClass: "btn btn-danger",
        browseLabel: '选择文件...',
        fileType: "any"
    });
    $('#fileSimple').on('fileselect', function(event, numFiles, label) {
        var files = event.target.files;
        var projectId=$('#projectSelect').val();
        var projectName=$("#projectSelect").find("option:selected").text();
        var rigName=$("#projectSelect").find("option:selected").attr("data-rigName");
        for (var fileIndex=0;fileIndex<files.length;fileIndex++) {
            var file=files[fileIndex];
            var fileId=0;
            var fileData={
                "projectId":projectId,
                "projectName":projectName,
                "rigName":rigName,
                "name": file.name,
                "size": (file.size/(1024*1024))+"M",
                "realsize": file.size,
                "path": file.path,
                "status": "",
                "time": file.lastModifiedDate,
                "progress":0
            }
            addFileData(fileData,function(data,key){
                data.key=key;
                $('#fileTable').DataTable().row.add(data).draw();
            });
        }

    });
    var dt=$("#fileTable").DataTable( {
        columns: [
            {data:'key', title:'ID',orderable: false,searchable:false},
            { data: 'name',title:'文件名称',orderable: false,searchable:false },
            { data: 'size',title:'文件大小',orderable: false,searchable:false },
            { data: 'projectName',title:'隶属项目',orderable: false,searchable:false },
            //{ data: 'path',title:'路径',orderable: false,searchable:false },
            { data: 'status',title:'状态',orderable: false,searchable:false },
            { data: 'progress',title:'进度',orderable: false,searchable:false, render: function ( data, type, rowData, meta ) {
                var str='<div class="progress-bar progress-bar-success progress-bar-striped" id="progressBar'+rowData.key+'" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width:0%;height: 10px;"> </div>';
                return str;
            } },
            { title:'操作',orderable: false, render: function ( data, type, rowData, meta ) {
                //var option = '<a ><span class="fa fa-eye" style="cursor: pointer;color:green;" title="编辑"></span></a>';
                var option  =  '<a class="deleteControl" data-key="'+rowData.key+'"><span class="fa fa-times" style="cursor: pointer;color:red;" title="删除"></span></a>';
                if(rowData.status){
                    option  =  '<a class="detailControl" data-key="'+rowData.key+'" ><span class="fa fa-eye" style="cursor: pointer;color:green;" title="编辑"></span></a>';
                }
                return option;
            } }

        ],
        searching: true,
        paging: true,
        ordering: true,
        order:[0,'asc'],
        oLanguage : {
            sLengthMenu: "每页显示 _MENU_ 条记录",
            sZeroRecords: "抱歉， 没有找到",
            sInfo: "从 _START_ 到 _END_ /共 _TOTAL_ 条数据",
            sInfoEmpty: "没有数据",
            sInfoFiltered: "(从 _MAX_ 条数据中检索)",
            sZeroRecords: "没有检索到数据",
            sSearch: "名称:",
            oPaginate: {
                sFirst: "首页",
                sPrevious: "上一页",
                sNext: "下一页",
                sLast: "末页"
            }
        }
    });

    $('#fileTable tbody').on('click','tr td a.deleteControl',function (){
        var tr = $(this).closest('tr');
        dt.row(tr).remove().draw();
        dropOneFile($(this).attr('data-key'));
    } );
    $('#fileTable tbody').on('click','tr td a.detailControl',function (){
        showOneFile($(this).attr('data-key'));
    } );
    var dht=$("#fileHistoryTable").DataTable( {
        columns: [
            {data:'key', title:'ID',orderable: false,searchable:false},
            { data: 'name',title:'文件名称',orderable: false,searchable:false },
            { data: 'size',title:'文件大小',orderable: false,searchable:false },
            { data: 'projectName',title:'隶属项目',orderable: false,searchable:false },
            { data: 'path',title:'路径',orderable: false,searchable:false },
            { data: 'status',title:'状态',orderable: false,searchable:false },
            { title:'操作',orderable: false, render: function ( data, type, rowData, meta ) {
                var option  =  '<a class="detailControl" data-key="'+rowData.key+'" ><span class="fa fa-eye" style="cursor: pointer;color:green;" title="编辑"></span></a>'
                return option;
            } }
        ],
        searching: true,
        paging: true,
        ordering: true,
        order:[0,'asc'],
        oLanguage : {
            sLengthMenu: "每页显示 _MENU_ 条记录",
            sZeroRecords: "抱歉， 没有找到",
            sInfo: "从 _START_ 到 _END_ /共 _TOTAL_ 条数据",
            sInfoEmpty: "没有数据",
            sInfoFiltered: "(从 _MAX_ 条数据中检索)",
            sZeroRecords: "没有检索到数据",
            sSearch: "名称:",
            oPaginate: {
                sFirst: "首页",
                sPrevious: "上一页",
                sNext: "下一页",
                sLast: "末页"
            }
        }
    });
    $('#fileHistoryTable tbody').on('click','tr td a.detailControl',function (){
        showOneFile($(this).attr('data-key'));
    } );
    getUserInfo();
});

