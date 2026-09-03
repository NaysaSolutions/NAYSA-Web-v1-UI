USE [db_a9be64_naysacloudcomp1]
GO
/****** Object:  StoredProcedure [dbo].[sproc_PHP_PO]    Script Date: 08/31/2026 10:45:42 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


ALTER procedure [dbo].[sproc_PHP_PO]
    @mode   nvarchar(max),
    @params nvarchar(max) = null
as
begin
    set nocount on;

    set @params = case when @mode = 'Get' then concat('{"json_data":', @params, '}') else @params end;

    declare
        @_dt1             nvarchar(max) = json_query(@params, '$.json_data.dt1'),
        @_dt3             nvarchar(max) = json_query(@params, '$.json_data.dt3'),
        @_branchCode      nvarchar(10)  = isnull(json_value(@params, '$.json_data.branchCode'), ''),
        @_poNo            nvarchar(25)  = isnull(json_value(@params, '$.json_data.poNo'), ''),
        @_poId            nvarchar(40)  = isnull(json_value(@params, '$.json_data.poId'), ''),
        @_documentID      nvarchar(40)  = isnull(json_value(@params, '$.json_data.documentID'), ''),
        @_groupId         nvarchar(40)  = isnull(json_value(@params, '$.json_data.groupId'), ''),
        @_poDate          datetime      = json_value(@params, '$.json_data.poDate'),
        @_cutoffCode      nvarchar(6)   = isnull(json_value(@params, '$.json_data.cutoffCode'), ''),
        @_rcCode          nvarchar(20)  = isnull(json_value(@params, '$.json_data.rcCode'), ''),
        @_vendCode        nvarchar(20)  = isnull(json_value(@params, '$.json_data.vendCode'), ''),
        @_vendName        nvarchar(200) = isnull(json_value(@params, '$.json_data.vendName'), ''),
        @_whCode          nvarchar(20)  = isnull(json_value(@params, '$.json_data.whCode'), ''),
        @_whName          nvarchar(200) = isnull(json_value(@params, '$.json_data.whName'), ''),
        @_delivAddress    nvarchar(200) = isnull(json_value(@params, '$.json_data.delAddress'), ''),
        @_vendContact     nvarchar(100) = isnull(json_value(@params, '$.json_data.vendContact'), ''),
        @_paytermCode     nvarchar(10)  = isnull(json_value(@params, '$.json_data.paytermCode'), ''),
        @_poType          nvarchar(10)  = isnull(json_value(@params, '$.json_data.poType'), ''),
        @_invType         nvarchar(10)  = isnull(json_value(@params, '$.json_data.invType'), ''),
        @_delDate         datetime      = json_value(@params, '$.json_data.delDate'),
        @_currCode        nvarchar(10)  = isnull(json_value(@params, '$.json_data.currCode'), ''),
        @_currRate        decimal(18,6) = json_value(@params, '$.json_data.currRate'),
        @_refPoNo1        nvarchar(25)  = isnull(json_value(@params, '$.json_data.refPoNo1'), ''),
        @_refPoNo2        nvarchar(25)  = isnull(json_value(@params, '$.json_data.refPoNo2'), ''),
        @_poAmount        decimal(18,2) = json_value(@params, '$.json_data.poAmount'),
        @_vatAmount       decimal(18,2) = json_value(@params, '$.json_data.vatAmount'),
        @_discAmount      decimal(18,2) = json_value(@params, '$.json_data.discAmount'),
        @_remarks         nvarchar(4000)= isnull(json_value(@params, '$.json_data.remarks'), ''),
        @_poStatus        nvarchar(10)  = json_value(@params, '$.json_data.poStatus'),
        @_poCancelled     nvarchar(1)   = isnull(json_value(@params, '$.json_data.poCancelled'), ''),
        @_noReprints      int           = json_value(@params, '$.json_data.noReprints'),
        @_userCode        nvarchar(25)  = json_value(@params, '$.json_data.userCode'),
        @_userName        nvarchar(25)  = json_value(@params, '$.json_data.userName'),
        @_direction       nvarchar(max) = json_value(@params, '$.json_data.direction'),
        @_selectedIds     nvarchar(max) = coalesce(json_value(@params, '$.json_data.tranIds'), json_value(@params, '$.json_data.selectedIds')),
        @_currentAppLevel int           = json_value(@params, '$.json_data.appLevel'),
        @_disAppReason    nvarchar(max) = json_value(@params, '$.json_data.reason'),
        @_dateStamp       datetime      = dbo.fngetdate(),
        @_timeStamp       nvarchar(4)   = dbo.fnGetTimeStamp(),
        @_startDate       datetime      = json_value(@params, '$.json_data.startDate'),
        @_endDate         datetime      = json_value(@params, '$.json_data.endDate'),
        @_tranDocId       nvarchar(10)  = 'PO',
        @_url             nvarchar(100) = json_value(@params, '$.json_data.url'),
        @_approvalMode    nvarchar(100) = json_value(@params, '$.json_data.mode'),
        @_tranDocExist    bit           = 0,
        @_result          nvarchar(max),
        @ErrorMessage     nvarchar(4000) = error_message(),
        @ErrorSeverity    int            = error_severity(),
        @ErrorState       int            = error_state(),
        @errorHeader      nvarchar(max)  = 'The following fields are required : ' + char(10) + char(10),
        @errorMsg         nvarchar(max)  = '',
        @counter          int            = 1,
        @activity         nvarchar(max);

        declare @_maxAppLevel int = 0,
                @_appLevel    int = 0

        select @_maxAppLevel = isnull(max(app_level),0) from app_level where doc_id ='PO'
        select @_appLevel = app_level from app_level where doc_id ='PO'  and user_code = @_usercode
        declare @_poDocApp nvarchar(1) = 'N'
        select @_poDocApp = isnull(max(doc_app), 'N') from hs_doc where doc_id = 'PO'

    set @_poId = coalesce(nullif(@_poId, ''), nullif(@_documentID, ''));




    if @mode in ('Upsert')
    begin
        declare @invoiceTbl table(
            po_id          nvarchar(40),
            pr_id          nvarchar(40),
            group_id       nvarchar(40),
            pr_no          nvarchar(25),
            rc_code        nvarchar(20),
            pr_status      nvarchar(1),
            po_status      nvarchar(1),
            inv_type       nvarchar(4),
            line_no        int,
            item_code      nvarchar(30),
            item_name      nvarchar(200),
            uom_code       nvarchar(10),
            required_uom_code nvarchar(10),
            required_quantity decimal(18,6),
            conversion_factor decimal(18,6),
            po_quantity    decimal(18,6),
            unit_cost      decimal(18,6),
            gross_amount   decimal(18,2),
            disc_rate      decimal(14,2),
            disc_amount    decimal(18,2),
            net_amount     decimal(18,2),
            vat_code       nvarchar(10),
            vat_amount     decimal(18,2),
            item_amount    decimal(18,2),
            item_specs     nvarchar(4000),
            del_date       date,
            rr_qty         decimal(18,6),
            pr_balance     decimal(18,6)
        );

        declare @summaryTbl table(
            po_id          nvarchar(40),
            po_status      nvarchar(1),
            inv_type       nvarchar(4),
            line_no        int,
            item_code      nvarchar(30),
            item_name      nvarchar(200),
            uom_code       nvarchar(10),
            required_uom_code nvarchar(10),
            required_quantity decimal(18,6),
            conversion_factor decimal(18,6),
            po_quantity    decimal(18,6),
            unit_cost      decimal(18,8),
            gross_amount   decimal(18,2),
            disc_rate      decimal(14,2),
            disc_amount    decimal(18,2),
            net_amount     decimal(18,2),
            vat_code       nvarchar(10),
            vat_amount     decimal(18,2),
            item_amount    decimal(18,2),
            item_specs     nvarchar(4000)
        );

        insert into @invoiceTbl (po_id, pr_id, group_id, pr_no, rc_code, po_status, inv_type, line_no, item_code, item_name, uom_code,
                                 required_uom_code, required_quantity, conversion_factor, po_quantity, unit_cost, gross_amount, disc_rate, disc_amount, net_amount, vat_code, vat_amount, item_amount,
                                 item_specs, del_date, rr_qty, pr_balance)
        select
            j.poId,
            j.prId,
            isnull(j.groupId,newid()),
            j.prNo,
            j.rcCode,
            j.poStatus,
            j.invType,
            j.lnNo,
            j.itemCode,
            j.itemName,
            j.uomCode,
            isnull(nullif(j.requiredUomCode, ''), j.uomCode),
            isnull(j.requiredQty, j.poQty),
            isnull(nullif(j.conversionFactor, 0), 1),
            j.poQty,
            j.unitCost,
            j.grossAmount,
            j.discRate,
            j.discAmount,
            j.netAmount,
            j.vatCode,
            j.vatAmount,
            j.itemAmount,
            j.itemSpecs,
            j.dateNeeded,
            j.rrQty,
            j.prBalance
        from openjson(@_dt1) with (
            poId         nvarchar(40)   '$.poId',
            prId         nvarchar(40)   '$.prId',
            groupId      nvarchar(40)   '$.groupId',
            prNo         nvarchar(25)   '$.prNo',
            rcCode       nvarchar(20)   '$.rcCode',
            poStatus     nvarchar(1)    '$.poStatus',
            invType      nvarchar(4)    '$.invType',
            lnNo         int            '$.lnNo',
            itemCode     nvarchar(30)   '$.itemCode',
            itemName     nvarchar(200)  '$.itemName',
            uomCode      nvarchar(10)   '$.uomCode',
            requiredUomCode nvarchar(10) '$.requiredUomCode',
            requiredQty  decimal(18,6)  '$.requiredQty',
            conversionFactor decimal(18,6) '$.conversionFactor',
            poQty        decimal(18,6)  '$.poQty',
            unitCost     decimal(18,6)  '$.unitCost',
            grossAmount  decimal(18,2)  '$.grossAmount',
            discRate     decimal(14,2)  '$.discRate',
            discAmount   decimal(18,2)  '$.discAmount',
            netAmount    decimal(18,2)  '$.netAmount',
            vatCode      nvarchar(10)   '$.vatCode',
            vatAmount    decimal(18,2)  '$.vatAmount',
            itemAmount   decimal(18,2)  '$.itemAmount',
            itemSpecs    nvarchar(4000) '$.itemSpecs',
            dateNeeded   date           '$.dateNeeded',
            rrQty        decimal(18,6)  '$.rrQty',
            prBalance    decimal(18,6)  '$.prBalance'
        ) as j;

        if isjson(@_dt3) = 1
        begin
            insert into @summaryTbl (po_id, po_status, inv_type, line_no, item_code, item_name, uom_code,
                                     required_uom_code, required_quantity, conversion_factor, po_quantity, unit_cost, gross_amount, disc_rate, disc_amount, net_amount,
                                     vat_code, vat_amount, item_amount, item_specs)
            select
                j.poId,
                j.poStatus,
                j.invType,
                j.lnNo,
                j.itemCode,
                j.itemName,
                j.uomCode,
                isnull(nullif(j.requiredUomCode, ''), j.uomCode),
                isnull(j.requiredQty, j.poQty),
                isnull(nullif(j.conversionFactor, 0), 1),
                j.poQty,
                j.unitCost,
                j.grossAmount,
                j.discRate,
                j.discAmount,
                j.netAmount,
                j.vatCode,
                j.vatAmount,
                j.itemAmount,
                j.itemSpecs
            from openjson(@_dt3) with (
                poId         nvarchar(40)   '$.poId',
                poStatus     nvarchar(1)    '$.poStatus',
                invType      nvarchar(4)    '$.invType',
                lnNo         int            '$.lnNo',
                itemCode     nvarchar(30)   '$.itemCode',
                itemName     nvarchar(200)  '$.itemName',
                uomCode      nvarchar(10)   '$.uomCode',
                requiredUomCode nvarchar(10) '$.requiredUomCode',
                requiredQty  decimal(18,6)  '$.requiredQty',
                conversionFactor decimal(18,6) '$.conversionFactor',
                poQty        decimal(18,6)  '$.poQty',
                unitCost     decimal(18,8)  '$.unitCost',
                grossAmount  decimal(18,2)  '$.grossAmount',
                discRate     decimal(14,2)  '$.discRate',
                discAmount   decimal(18,2)  '$.discAmount',
                netAmount    decimal(18,2)  '$.netAmount',
                vatCode      nvarchar(10)   '$.vatCode',
                vatAmount    decimal(18,2)  '$.vatAmount',
                itemAmount   decimal(18,2)  '$.itemAmount',
                itemSpecs    nvarchar(4000) '$.itemSpecs'
            ) as j;
        end
    end;







    if @mode in ('Upsert')
    begin
        begin try
            begin tran;

            set @errorMsg = iif(isnull(@_branchCode, '') = '', concat(@errorMsg, ' - Header - Branch', char(10)), @errorMsg);
            set @errorMsg = iif(isnull(@_vendCode, '') = '', concat(@errorMsg, ' - Header - Payee Code', char(10)), @errorMsg);
            set @errorMsg = iif(isnull(@_paytermCode, '') = '', concat(@errorMsg, ' - Header - Payment Terms', char(10)), @errorMsg);
            set @errorMsg = iif(isnull(@_poDate, '') = '', concat(@errorMsg, ' - Header - PO Date', char(10)), @errorMsg);
            set @errorMsg = iif(isnull(@_poType, '') = '', concat(@errorMsg, ' - Header - PO Type', char(10)), @errorMsg);
            set @errorMsg = iif(
                isnull(@_rcCode, '') = ''
                and not exists
                (
                    select 1
                    from @invoiceTbl
                    where po_status not in ('C', 'X')
                      and (nullif(pr_id, '') is not null or nullif(pr_no, '') is not null)
                ),
                concat(@errorMsg, ' - Header - Department', char(10)),
                @errorMsg
            );
            set @errorMsg = iif(
                @_poType = 'PO12'
                and exists
                (
                    select 1
                    from @invoiceTbl
                    where po_status not in ('C', 'X')
                      and (nullif(pr_id, '') is not null or nullif(pr_no, '') is not null)
                ),
                concat(@errorMsg, ' - Direct PO cannot contain PR Information', char(10)),
                @errorMsg
            );

            set @counter = 1;
            while @counter <= (select count(*) from @invoiceTbl)
            begin
                set @errorMsg = @errorMsg + isnull((
                    select top 1 concat(' - Item Detail LN # ', line_no, ' - Item Code', char(10))
                    from @invoiceTbl
                    where line_no = @counter and isnull(item_code, '') = ''
                    and po_status not in ('C', 'X')
                ), '');

                set @errorMsg = @errorMsg + isnull((
                    select top 1 concat(' - Item Detail LN # ', line_no, ' - UOM', char(10))
                    from @invoiceTbl
                    where line_no = @counter and isnull(uom_code, '') = ''
                    and po_status not in ('C', 'X')
                ), '');

                 set @errorMsg = @errorMsg + isnull((
                    select top 1 concat(' - Item Detail LN # ', line_no, ' - PO Quantity', char(10))
                    from @invoiceTbl
                    where line_no = @counter and isnull(po_quantity, 0) <= 0
                    and po_status not in ('C', 'X')
                ), '');

                set @errorMsg = @errorMsg + isnull((
                    select top 1 concat(' - Item Detail LN # ', line_no, ' - Unit Cost', char(10))
                    from @invoiceTbl
                    where line_no = @counter and isnull(unit_cost, 0) <= 0
                    and po_status not in ('C', 'X')
                ), '');

                set @errorMsg = @errorMsg + isnull((
                    select top 1 concat(' - Item Detail LN # ', line_no, ' - VAT Code', char(10))
                    from @invoiceTbl
                    where line_no = @counter and isnull(vat_code, '') = ''
                    and po_status not in ('C', 'X')
                ), '');

                set @errorMsg = @errorMsg + isnull((
                    select top 1 concat(' - Item Detail LN # ', i.line_no, ' - Item Specs / Asset Description is required for Fixed Asset item', char(10))
                    from @invoiceTbl i
                    left join ms_mast m
                        on m.item_code = i.item_code
                    left join ms_categ c
                        on c.categ_code = m.categ_code
                    where i.line_no = @counter
                      and isnull(i.po_status, '') not in ('C', 'X')
                      and upper(isnull(nullif(c.categ_code, ''), isnull(m.categ_code, ''))) = 'FA'
                      and isnull(ltrim(rtrim(i.item_specs)), '') = ''
                ), '');

                set @counter += 1;
            end;

            if (@errorMsg <> '')
            begin
                rollback;
                select @errorHeader + @errorMsg as errorMsg, 1 as errorCount;
                return;
            end;

            if exists (select 1 from po_hd where po_id = @_poId)
            begin set @_tranDocExist = 1; end
            else
            begin set @_tranDocExist = 0; end;

            set @_poId = case when @_poId is null or @_poId = '' then convert(nvarchar(40), newid()) else @_poId end;
            set @_poNo = case when @_poNo is null or @_poNo = '' then dbo.fnGetNextDocumentNo(@_tranDocId, '', @_branchCode) else @_poNo end;
            set @_cutoffCode =  dbo.fnGetPeriod(@_poDate)

            if @_tranDocExist = 0
            begin
                insert into po_hd (branch_code, po_no, po_id, po_date, cutoff_code, rc_code, vend_code, vend_name,
                                   wh_code, wh_name, deliv_address, vend_contact, payterm_code, po_type, del_date,
                                   curr_code, curr_rate, refpo_no1, refpo_no2, po_amount, vat_amount, disc_amount,
                                   adv_amount, remarks, po_status, po_cancelled, no_reprints, user_code, date_stamp, time_stamp)
                values (@_branchCode, @_poNo, @_poId, @_poDate, @_cutoffCode, @_rcCode, @_vendCode, @_vendName,
                        @_whCode, @_whName, @_delivAddress, @_vendContact, @_paytermCode, @_poType, @_delDate,
                        @_currCode, @_currRate, @_refPoNo1, @_refPoNo2, @_poAmount, @_vatAmount, @_discAmount,
                        0, @_remarks, 'O', @_poCancelled, isnull(@_noReprints, 0), @_userCode, @_dateStamp, @_timeStamp);

                exec sproc_PHP_DocSign
                    @_mode ='Upsert',
                    @_tranid = @_poId,
                    @_docId = @_tranDocId,
                    @_docno = @_poNo,
                    @_userCode = @_userCode,
                    @_branchCode = @_branchCode

                exec sproc_PHP_DocApp
                    @_mode = 'Upsert',
                    @_tranid = @_poId,
                    @_docId = @_tranDocId;
            end
            else
            begin
                update po_hd
                   set po_date      = @_poDate,
                       cutoff_code  = @_cutoffCode,
                       rc_code      = @_rcCode,
                       vend_code    = @_vendCode,
                       vend_name    = @_vendName,
                       wh_code      = @_whCode,
                       wh_name      = @_whName,
                       deliv_address= @_delivAddress,
                       vend_contact = @_vendContact,
                       payterm_code = @_paytermCode,
                       po_type      = @_poType,
                       del_date     = @_delDate,
                       curr_code    = @_currCode,
                       curr_rate    = @_currRate,
                       refpo_no1    = @_refPoNo1,
                       refpo_no2    = @_refPoNo2,
                       po_amount    = @_poAmount,
                       vat_amount   = @_vatAmount,
                       disc_amount  = @_discAmount,
                       remarks      = @_remarks,
                       po_status    = @_poStatus,
                       po_cancelled = @_poCancelled,
                       no_reprints  = isnull(@_noReprints, 0),
                       user_code    = @_userCode,
                       date_stamp   = @_dateStamp,
                       time_stamp   = @_timeStamp
                 where po_id = @_poId;
            end;

             exec sproc_PHP_AllTran_ReturnValue
                    @docCode =@_tranDocId,
                    @docID = @_poId,
                    @mode ='Begin'

            delete from po_dt1 where po_id = @_poId;

            insert into po_dt1 (branch_code, po_no, po_date, pr_no, cutoff_code, rc_code, line_no, po_status, inv_type,
                                group_id, item_code, item_name, uom_code, required_uom_code, required_quantity, conversion_factor, po_quantity, unit_cost, gross_amount,
                                disc_rate, disc_amount, net_amount, vat_code, vat_amount, item_amount, item_specs,
                                del_date, rr_qty, pr_balance, po_id, pr_id)
            select @_branchCode, @_poNo, @_poDate, pr_no, @_cutoffCode, isnull(nullif(rc_code, ''), @_rcCode), line_no, po_status, inv_type,
                   group_id, item_code, item_name, uom_code, required_uom_code, required_quantity, conversion_factor, po_quantity, unit_cost, gross_amount,
                   disc_rate, disc_amount, net_amount, vat_code, vat_amount, item_amount, item_specs,
                   del_date, rr_qty, pr_balance, @_poId, pr_id
            from @invoiceTbl;

            delete from po_dt3 where po_id = @_poId;

            if @_poType = 'PO12'
                delete from @summaryTbl;

            insert into po_dt3 (branch_code, po_no, po_id, po_date, cutoff_code, vend_code, line_no, po_status, inv_type,
                                item_code, item_name, uom_code, required_uom_code, required_quantity, conversion_factor, po_quantity, unit_cost, gross_amount, disc_rate,
                                disc_amount, net_amount, vat_code, vat_amount, item_amount, item_specs)
            select @_branchCode, @_poNo, @_poId, @_poDate, @_cutoffCode, @_vendCode, line_no, po_status, inv_type,
                   item_code, item_name, uom_code, required_uom_code, required_quantity, conversion_factor, po_quantity, unit_cost, gross_amount, disc_rate,
                   disc_amount, net_amount, vat_code, vat_amount, item_amount, item_specs
            from @summaryTbl;

            /* =========================================================
               update pr status / balance
               ========================================================= */
            declare @pr_list table (pr_id nvarchar(40));

            insert into @pr_list (pr_id)
            select distinct pr.pr_id
            from po_dt1 d
            join pr_hd pr
              on pr.pr_no = d.pr_no
             and pr.branch_code = @_branchCode
            where d.po_id = @_poId
              and d.pr_no is not null
              and d.pr_no <> '';

            ;with agg as (
                select
                    pr.pr_id,
                    d.item_code,
                    sum(d.po_quantity) as total_po_qty
                from po_dt1 d
                join pr_hd pr on pr.pr_no = d.pr_no and pr.branch_code = @_branchCode
                join po_hd po on d.po_id = po.po_id
                join @pr_list l on l.pr_id = pr.pr_id
                where po.po_status <> 'X'
                group by pr.pr_id, d.item_code
            )
            update p
               set p.po_qty = a.total_po_qty,
                   p.pr_status =
                       case
                           when exists (
                               select 1 from @invoiceTbl i
                               where i.pr_no = h.pr_no
                                 and i.item_code = p.item_code
                                 and upper(i.pr_status) in ('C', 'CLOSED')
                           ) then 'C'
                           when a.total_po_qty >= p.qty_needed
                                and p.qty_needed is not null
                                and p.qty_needed > 0 then 'C'
                           else 'O'
                       end
            from pr_dt1 p
            join pr_hd h on h.pr_id = p.pr_id
            join agg a   on a.pr_id = p.pr_id and a.item_code = p.item_code;

            update h
               set h.pr_status =
                   case
                       when not exists (
                           select 1 from pr_dt1 d
                           where d.pr_id = h.pr_id
                             and isnull(d.pr_status, 'O') <> 'C'
                       ) then 'C'
                       else 'O'
                   end
            from pr_hd h
            join @pr_list l on l.pr_id = h.pr_id;

            declare @_activity nvarchar(20);
            set @_activity = case when @_tranDocExist = 0 then 'Created' else 'Edited' end;

            exec sproc_PHP_DocTrail
                 @_mode       = 'Upsert',
                 @_tranid     = @_poId,
                 @_docCode    = @_tranDocId,
                 @_docNo      = @_poNo,
                 @_branchCode = @_branchCode,
                 @_userCode   = @_userCode,
                 @_activity   = @_activity;

            exec sproc_PHP_AllTran_ReturnValue
                    @docCode =@_tranDocId,
                    @docID = @_poId,
                    @mode ='End'

            select @_poNo as poNo, @_poId as poId;

            commit tran;
        end try
        begin catch
            if @@trancount > 0
                rollback tran;

            select
                @ErrorMessage = error_message(),
                @ErrorSeverity = error_severity(),
                @ErrorState = error_state();

            raiserror (@ErrorMessage, @ErrorSeverity, @ErrorState);
        end catch;

        return;
    end;









    if @mode = 'Get'
    begin
        set @_direction = case when @_direction = '' or @_direction is null then '' else @_direction end;

        if @_direction <> ''
        begin
            set @_poId = dbo.fn_GetRetrieval_TranID(@_tranDocId, @_branchCode, @_poNo, @_direction);
        end;

        if (@_poId is null or @_poId = '')
        begin
            select @_poId = po_id
            from po_hd
            where po_no = @_poNo
              and branch_code = @_branchCode;
        end;

        if (@_poId is null or @_poId = '')
        begin
            select '{"result":null}' as result;
            return;
        end;

        declare @_dtl nvarchar(max),
                @_dtlSummary nvarchar(max),
                @_dtApp nvarchar(max);

        ;with cteDtl as (
            select
                d.line_no      as lN,
                d.po_id        as poId,
                d.pr_id        as prId,
                d.group_id     as groupId,
                d.pr_no        as prNo,
                d.po_status    as poStatus,
                d.rc_code      as rcCode,
                isnull(r.rc_name, '') as rcName,
                d.inv_type     as invType,
                d.item_code    as itemCode,
                d.item_name    as itemName,
                d.uom_code     as uomCode,
                d.required_uom_code as requiredUomCode,
                d.required_quantity as requiredQty,
                d.conversion_factor as conversionFactor,
                d.po_quantity  as poQuantity,
                d.unit_cost    as unitCost,
                d.gross_amount as grossAmount,
                d.disc_rate    as discRate,
                d.disc_amount  as discAmount,
                d.net_amount   as netAmount,
                d.vat_code     as vatCode,
                d.vat_amount   as vatAmount,
                d.item_amount  as itemAmount,
                d.item_specs   as itemSpecs,
                d.del_date     as dateNeeded,
                d.rr_qty       as rrQty,
                d.pr_balance   as prBalance
            from po_dt1 d
            left join rc_mast r on r.rc_code = d.rc_code
            where d.po_id = @_poId
        )
        select @_dtl = (select * from cteDtl order by lN for json auto, include_null_values);

        ;with cteSummary as (
            select
                d.line_no      as lN,
                d.po_id        as poId,
                d.po_status    as poStatus,
                d.inv_type     as invType,
                d.item_code    as itemCode,
                d.item_name    as itemName,
                d.uom_code     as uomCode,
                d.required_uom_code as requiredUomCode,
                d.required_quantity as requiredQty,
                d.conversion_factor as conversionFactor,
                d.po_quantity  as poQuantity,
                d.unit_cost    as unitCost,
                d.gross_amount as grossAmount,
                d.disc_rate    as discRate,
                d.disc_amount  as discAmount,
                d.net_amount   as netAmount,
                d.vat_code     as vatCode,
                d.vat_amount   as vatAmount,
                d.item_amount  as itemAmount,
                d.item_specs   as itemSpecs
            from po_dt3 d
            where d.po_id = @_poId
        )
        select @_dtlSummary = (select * from cteSummary order by lN for json auto, include_null_values);

        ;with cteApp as (
            select a.tran_id, a.app_date1, a.app_date2, a.app_date3, a.app_date4,
                   a.app_note1, a.app_note2, a.app_note3, a.app_note4,
                   ap1.user_name user_app1, ap2.user_name user_app2,
                   ap3.user_name user_app3, ap4.user_name user_app4
            from doc_app a
                left join users ap1 on ap1.user_code = a.user_app1
                left join users ap2 on ap2.user_code = a.user_app2
                left join users ap3 on ap3.user_code = a.user_app3
                left join users ap4 on ap4.user_code = a.user_app4
            where a.tran_id = @_poId
        )
        select @_dtApp = (select * from cteApp for json auto, include_null_values);

        ;with cteHeader as (
            select
                h.branch_code      as branchCode,
                b.branch_name      as branchName,
                h.po_id            as poId,
                h.po_no            as poNo,
                h.po_date          as poDate,
                h.cutoff_code      as cutoffCode,
                h.rc_code          as rcCode,
                r.rc_name          as rcName,
                h.vend_code        as vendCode,
                h.vend_name        as vendName,
                h.wh_code          as whCode,
                h.wh_name          as whName,
                h.deliv_address    as delivAddress,
                h.vend_contact     as vendContact,
                h.payterm_code     as paytermCode,
                h.po_type          as poType,
                h.del_date         as delDate,
                h.curr_code        as currCode,
                t.curr_name           as currName,
                h.curr_rate        as currRate,
                h.refpo_no1        as refPoNo1,
                h.refpo_no2        as refPoNo2,
                h.po_amount        as poAmount,
                h.vat_amount       as vatAmount,
                h.disc_amount      as discAmount,
                h.adv_amount       as advAmount,
                h.remarks          as remarks,
                dbo.fnGetDocumentStatus(h.po_status, h.po_cancelled) as status,
                isnull(d.app_level, 0) as appLevel,
                h.po_status        as poHStatus,
                h.po_cancelled     as poCancelled,
                isnull(h.no_reprints, 0) as noReprints,
                dt1                = json_query(@_dtl),
                dt3                = json_query(@_dtlSummary),
                dtApp              = json_query(@_dtApp)
            from po_hd h
                join branch_ref b on b.branch_code = h.branch_code
                join curr_ref t on t.curr_code = h.curr_code
                left join rc_mast r on r.rc_code = h.rc_code
                left join doc_app d on d.tran_id = h.po_id and d.doc_id = 'PO'
            where h.po_id = @_poId
        )
        select @_result = (select * from cteHeader for json path, include_null_values, without_array_wrapper);
        select @_result as result;
        return;
    end;












    if @mode = 'Load'
    begin
        ;with cteD as (
            select
                h.branch_code  as branchCode,
                h.po_id        as poId,
                h.po_no        as poNo,
                cast(isnull(h.po_date, dbo.fngetdate()) as date) as poDate,
                h.rc_code      as rcCode,
                h.vend_code    as vendCode,
                h.vend_name    as vendName,
                h.payterm_code as paytermCode,
                h.po_type      as poType,
                h.cutoff_code  as cutoffCode,
                h.po_status    as status,
                h.po_cancelled as poCancelled,
                h.user_code    as preparedBy,
                h.date_stamp   as dateStamp,
                h.time_stamp   as timeStamp
            from po_hd h
            where h.po_date between @_startDate and @_endDate
              and h.branch_code = @_branchCode
        )
        select @_result = (select * from cteD order by poNo desc for json path, include_null_values);
        select @_result as result;
        return;
    end;













    if @mode = 'Cancel'
    begin
        begin try
            begin tran;
            update po_hd set
                po_status = 'X',
                po_cancelled = 'Y',
                po_amount =0,
                vat_amount =0,
                adv_amount =0,
                remarks = concat('Cancelled by: ', @_userCode, char(10), 'Reason: ', isnull(nullif(@_disAppReason, ''), 'No reason provided'), char(10), char(10), coalesce(remarks, ''))
            where po_id = @_documentID;

            exec sproc_PHP_AllTran_ReturnValue
                    @docCode =@_tranDocId,
                    @docID = @_documentID,
                    @mode ='Begin'

             update po_dt1 set
                po_quantity =0 ,
                unit_cost =0,
                gross_amount =0,
                vat_amount =0,
                net_amount =0,
                item_amount =0,
                disc_rate =0,
                disc_amount=0,
                pr_balance =0,
                rr_qty =0,
                po_status ='X'
            where po_id = @_documentID;

             update po_dt3 set
                po_quantity =0 ,
                unit_cost =0,
                gross_amount =0,
                vat_amount =0,
                net_amount =0,
                item_amount =0,
                disc_rate =0,
                disc_amount=0,
                po_status ='X'
            where po_id = @_documentID;

            exec sproc_PHP_DocTrail
                @_mode = 'Upsert',
                @_tranid = @_documentID,
                @_docID = @_tranDocId,
                @_docNo = @_poNo,
                @_branchCode = @_branchCode,
                @_userCode = @_userCode,
                @_activity = 'Cancelled';

            exec sproc_PHP_AllTran_ReturnValue
                    @docCode =@_tranDocId,
                    @docID = @_documentID,
                    @mode ='End';

            select
                'Success' as result;
            commit tran;
        end try
        begin catch
            if @@trancount > 0 rollback tran;
            raiserror (@ErrorMessage, @ErrorSeverity, @ErrorState);
        end catch
        return;
    end












    if @mode = 'Post'
    begin
        begin try
            begin tran;

            update po_hd set po_status = 'F' where po_id = @_poId;
            update po_dt1 set po_status = 'F' where po_id = @_poId;
            update po_dt3 set po_status = 'F' where po_id = @_poId;

            exec sproc_PHP_DocTrail
                 @_mode       = 'Upsert',
                 @_tranid     = @_poId,
                 @_docCode    = @_tranDocId,
                 @_docNo      = @_poNo,
                 @_branchCode = @_branchCode,
                 @_userCode   = @_userCode,
                 @_activity   = 'Posted';

            select 'Success' as result;

            commit tran;
        end try
        begin catch
            if @@trancount > 0
                rollback tran;

            declare @ErrorMessageP nvarchar(4000) = error_message(),
                    @ErrorSeverityP int = error_severity(),
                    @ErrorStateP int = error_state();

            raiserror (@ErrorMessageP, @ErrorSeverityP, @ErrorStateP);
        end catch;

        return;
    end;









    if @mode = 'Find'
    begin
        declare @_findTable table (
            id int not null identity primary key,
            docNo nvarchar(25)
        );

        insert into @_findTable
        select top 10000 po_no
        from po_hd
        where branch_code = @_branchCode
        order by po_date;

        select @_result = (select * from @_findTable for json auto);
        select @_result result;
        return;
    end;











    if @mode = 'History'
    begin
        declare @_viewHeader nvarchar(max),
                @_viewDetail nvarchar(max);

        ;with cteH as (
            select
                h.branch_code   as branchCode,
                br.branch_name   as branchName,
                h.po_no         as docNo,
                h.po_date       as poDate,
                h.cutoff_code   as cutoffCode,
                h.rc_code       as rcCode,
                h.vend_code     as vendCode,
                h.vend_name     as vendName,
                r.payterm_name  as paytermCode,
                a.dropdown_name   as poType,
                h.refpo_no1     as refPoNo1,
                h.refpo_no2     as refPoNo2,
                h.curr_code     as currCode,
                h.curr_rate     as currRate,
                h.po_amount     as poAmount,
                h.vat_amount    as vatAmount,
                h.disc_amount   as discAmount,
                h.adv_amount    as advAmount,
                h.remarks       as remarks,
                h.user_code     as userCode,
                h.date_stamp    as dateStamp,
                h.time_stamp    as timeStamp,
                dbo.fnGetApprovalStatusByDocCode(h.po_id,h.po_status,@_tranDocId) appStatus,
                dbo.fnGetDocumentStatusHistory(h.po_status, h.po_cancelled) as doc_stat,
                dbo.fnGetDocumentStatus(h.po_status, h.po_cancelled) as poStatus
            from po_hd h
                join branch_ref br on br.branch_code = h.branch_code
                join hs_dropdown a on a.dropdown_code = h.po_type and a.doc_code ='PO'
                left join payterm_ref r on r.payterm_code = h.payterm_code
            where h.po_date between @_startDate and @_endDate
              and h.branch_code = @_branchCode
        )

        select @_viewHeader = (
            select *
            from cteH h
            order by h.branchCode, h.docNo desc
            for json path, include_null_values
        );

        ;with cte as (
            select
                d.branch_code   as branchCode,
                br.branch_name   as branchName,
                h.po_no         as docNo,
                h.po_date       as poDate,
                d.line_no       as lN,
                d.pr_no         as prNo,
                d.po_status     as poDtStatus,
                d.rc_code       as rcCode,
                isnull(t.rc_name, '') as rcName,
                d.inv_type      as invType,
                d.group_id      as groupId,
                d.item_code     as itemCode,
                d.item_name     as itemName,
                d.uom_code      as uomCode,
                d.required_uom_code as requiredUomCode,
                d.required_quantity as requiredQty,
                d.conversion_factor as conversionFactor,
                d.po_quantity   as poQuantity,
                h.curr_code     as currCode,
                d.unit_cost     as unitCost,
                d.gross_amount  as grossAmount,
                d.disc_rate     as discRate,
                d.disc_amount   as discAmount,
                d.net_amount    as netAmount,
                d.vat_code      as vatCode,
                d.vat_amount    as vatAmount,
                d.item_amount   as itemAmount,
                d.item_specs    as itemSpecs,
                d.del_date      as delDate,
                d.rr_qty        as rrQty,
                d.pr_balance    as prBalance,
                dbo.fnGetDocumentStatusHistory(h.po_status, h.po_cancelled) as doc_stat,
                dbo.fnGetDocumentStatus(h.po_status, h.po_cancelled) as poStatus
            from po_dt1 d
            join po_hd h
              on h.po_id = d.po_id
            join branch_ref br
              on br.branch_code = d.branch_code
            left join rc_mast t
              on t.rc_code = d.rc_code
            where h.po_date between @_startDate and @_endDate
              and d.branch_code = @_branchCode
        )

        select @_viewDetail = (
            select *
            from cte order by docNo desc, ln asc
            for json auto, include_null_values
        );

        ;with cteOut as (
            select
                PO_Summary = json_query(@_viewHeader),
                PO_Detail  = json_query(@_viewDetail)
        )

        select @_result = (
            select *
            from cteOut
            for json auto, include_null_values
        );

        select @_result as result;
        return;
    end












    if @mode = 'Approve' and @_approvalMode = 'Notify'
    begin

        declare @_activityPost nvarchar(20) = 'Posted';

        declare @_emailResult table
        (
            emailTo nvarchar(200),
            subject nvarchar(100),
            body nvarchar(4000)
        );

        insert into @_emailResult
        exec sproc_PHP_PO_Notification
            @doccode = @_tranDocId,
            @link = @_url,
            @documentids = @_selectedIds,
            @previousapplevel = 0,
            @mode = @_approvalMode,
            @approverName = @_userName;

        set @_activityPost = 'Notified L1';

        -- Audit Trails
        declare @_tranTbl table
        (
            id int not null identity primary key,
            docNo nvarchar(max),
            branchCode nvarchar(max),
            docId nvarchar(max)
        );

        insert into @_tranTbl
        select
            po_no,
            branch_code,
            po_id
        from po_hd
        where po_id in
        (
            select value
            from string_split(@_selectedIds, ',')
        );

        declare @_counter int = 1,
                @__poIDs nvarchar(max),
                @__ponos nvarchar(max),
                @__branches nvarchar(max);

        while @_counter <= (select count(0) from @_tranTbl)
        begin

            select
                @__poIDs = a.docId,
                @__ponos = a.docNo,
                @__branches = a.branchCode
            from @_tranTbl a
            where id = @_counter;

            update doc_app
            set app_level = 0
            where app_level = -1
              and tran_id = @__poIDs;

            exec sproc_PHP_DocTrail
                @_mode       = 'Upsert',
                @_tranid     = @__poIDs,
                @_docCode    = @_tranDocId,
                @_docNo      = @__ponos,
                @_branchCode = @__branches,
                @_userCode   = @_userCode,
                @_activity   = @_activityPost;

            set @_counter += 1;
        end;

        select @_result =
        (
            select *
            from @_emailResult
            for json auto
        );

        select @_result result;
        return;

    end;











    if @mode = 'GetApproval'
    begin

        ;with cteApproval as
        (
            select
                h.po_id         as tranId,
                h.branch_code   as branchCode,
                h.po_no         as docNo,
                h.po_date       as poDate,
                h.vend_code     as payeeCode,
                h.vend_name     as payeeName,
                h.cutoff_code   as cutoffCode,
                h.rc_code       as rcCode,
                t.rc_name       as rcName,
                h.remarks       as remarks,
                h.curr_code     as currCode,
                h.curr_rate     as currRate,
                h.po_amount     as poAmount,
                s.user_name     as preparedBy,
                r.user_app1     as userApp1,
                r.app_date1     as appDate1,
                r.app_note1     as appNote1,
                r.user_app2     as userApp2,
                r.app_date2     as appDate2,
                r.app_note2     as appNote2,
                r.user_app3     as userApp3,
                r.app_date3     as appDate3,
                r.app_note3     as appNote3,
                r.user_app4     as userApp4,
                r.app_date4     as appDate4,
                r.app_note4     as appNote4,
                dbo.fnGetViewDocumentURL('PO', h.po_no, h.branch_code) as viewDocument
            from po_hd h
                join users s
                    on s.user_code = h.user_code
                join doc_app r
                    on r.tran_id = h.po_id
                left join rc_mast t
                    on t.rc_code = h.rc_code
            where @_maxAppLevel > 0
              and @_appLevel > 0
              and isnull(r.app_level, 0) + 1 = @_appLevel
        )

        select @_result =
        (
            select *
            from cteApproval
            for json auto
        );

        select @_result result;
        return;

    end










    if @mode = 'Approve' and @_approvalMode = 'Approved'
    begin

        update x
            set x.app_level = isnull(x.app_level, 0) + 1,
                x.user_app1 = case when @_currentAppLevel = 1 then @_userCode else x.user_app1 end,
                x.app_date1 = case when @_currentAppLevel = 1 then dbo.fngetdate() else x.app_date1 end,
                x.user_app2 = case when @_currentAppLevel = 2 then @_userCode else x.user_app2 end,
                x.app_date2 = case when @_currentAppLevel = 2 then dbo.fngetdate() else x.app_date2 end,
                x.user_app3 = case when @_currentAppLevel = 3 then @_userCode else x.user_app3 end,
                x.app_date3 = case when @_currentAppLevel = 3 then dbo.fngetdate() else x.app_date3 end,
                x.user_app4 = case when @_currentAppLevel = 4 then @_userCode else x.user_app4 end,
                x.app_date4 = case when @_currentAppLevel = 4 then dbo.fngetdate() else x.app_date4 end
        from doc_app x
        where tran_id in
        (
            select value
            from string_split(@_selectedIds, ',')
        );

        delete from @_emailResult;

        insert into @_emailResult
        exec sproc_PHP_PO_Notification
            @doccode = @_tranDocId,
            @link = @_url,
            @documentids = @_selectedIds,
            @previousapplevel = @_currentAppLevel,
            @mode = @_approvalMode,
            @approverName = @_userName;

        set @_activityPost = concat('Approved L', @_currentAppLevel);

        -- Audit Trails
        delete from @_tranTbl;

        insert into @_tranTbl
        select
            po_no,
            branch_code,
            po_id
        from po_hd
        where po_id in
        (
            select value
            from string_split(@_selectedIds, ',')
        );

        set @_counter = 1;
        set @__poIDs = '';
        set @__ponos = '';
        set @__branches = '';

        while @_counter <= (select count(0) from @_tranTbl)
        begin

            select
                @__poIDs = a.docId,
                @__ponos = a.docNo,
                @__branches = a.branchCode
            from @_tranTbl a
            where id = @_counter;

            exec sproc_PHP_DocTrail
                @_mode       = 'Upsert',
                @_tranid     = @__poIDs,
                @_docCode    = @_tranDocId,
                @_docNo      = @__ponos,
                @_branchCode = @__branches,
                @_userCode   = @_userCode,
                @_activity   = @_activityPost;

            set @_counter += 1;
        end;

        select @_result =
        (
            select *
            from @_emailResult
            for json auto
        );

        select @_result result;
        return;

    end;












    if @mode = 'Approve' and @_approvalMode = 'Disapprove'
    begin

        update x
            set x.app_level = -1,
                x.user_app1 = null,
                x.app_date1 = null,
                x.user_app2 = null,
                x.app_date2 = null,
                x.user_app3 = null,
                x.app_date3 = null,
                x.user_app4 = null,
                x.app_date4 = null
        from doc_app x
        where tran_id in
        (
            select value
            from string_split(@_selectedIds, ',')
        );

        delete from @_emailResult;

        insert into @_emailResult
        exec sproc_PHP_PO_Notification
            @doccode = @_tranDocId,
            @link = @_url,
            @documentids = @_selectedIds,
            @previousapplevel = @_currentAppLevel,
            @mode = @_approvalMode,
            @reason = @_disAppReason,
            @approverName = @_userName;

        set @_activityPost = concat('Disapproved L', @_currentAppLevel);

        -- Audit Trails
        delete from @_tranTbl;

        insert into @_tranTbl
        select
            po_no,
            branch_code,
            po_id
        from po_hd
        where po_id in
        (
            select value
            from string_split(@_selectedIds, ',')
        );

        set @_counter = 1;
        set @__poIDs = '';
        set @__ponos = '';
        set @__branches = '';

        while @_counter <= (select count(0) from @_tranTbl)
        begin

            select
                @__poIDs = a.docId,
                @__ponos = a.docNo,
                @__branches = a.branchCode
            from @_tranTbl a
            where id = @_counter;

            exec sproc_PHP_DocTrail
                @_mode       = 'Upsert',
                @_tranid     = @__poIDs,
                @_docCode    = @_tranDocId,
                @_docNo      = @__ponos,
                @_branchCode = @__branches,
                @_userCode   = @_userCode,
                @_activity   = @_activityPost;

            set @_counter += 1;
        end;

        select @_result =
        (
            select *
            from @_emailResult
            for json auto
        );

        select @_result result;
        return;

    end












    if @mode = 'Approve' and @_approvalMode = 'Comment'
    begin

        declare @_commentValue nvarchar(max) = concat(
            'Comment By : ',
            @_userName,
            char(10),
            'Date and Time : ',
            format(dbo.fngetdate(), 'MM/dd/yyyy hh:mm'),
            char(10),
            char(10),
            @_disAppReason
        );

        update x
            set x.app_note1 = case when @_currentAppLevel = 1 then @_commentValue else x.app_note1 end,
                x.app_note2 = case when @_currentAppLevel = 2 then @_commentValue else x.app_note2 end,
                x.app_note3 = case when @_currentAppLevel = 3 then @_commentValue else x.app_note3 end,
                x.app_note4 = case when @_currentAppLevel = 4 then @_commentValue else x.app_note4 end
        from doc_app x
        where tran_id in
        (
            select value
            from string_split(@_selectedIds, ',')
        );

        select 'Success' as result;
        return;

    end;

    if @mode ='GetPORR_OpenSummary'
    begin

        ;with cte as (select
            a.po_id groupId,
            a.branch_code branchCode,
            a.po_no poNo,
            a.po_date poDate,
            a.vend_code vendCode,
            a.vend_name vendName,
            a.curr_code currCode,
            a.curr_rate currRate,
            a.wh_code whCode,
            a.wh_name whName,
            a.remarks remarks,
            a.date_stamp dateStamp,
            a.time_stamp timeStamp
         from po_hd a
            join (select po_id from po_dt1 p join ms_mast m on m.item_code = p.item_code where po_status ='O' and m.categ_code <> 'FA' and not exists (select 0 from msrr_dt1 e where e.group_id = p.group_id and e.quantity > 0)
                   and @_invType <>'FA'
                    group by po_id

                 union all
                 select po_id from po_dt1 p join ms_mast m on m.item_code = p.item_code where po_status ='O' and m.categ_code = 'FA' and not exists (select 0 from farr_dt1 e where e.group_id = p.group_id and e.rr_quantity > 0)
                 and @_invType = 'FA'
                 group by po_id
                    ) p on p.po_id = a.po_id
            left join rc_mast t on t.rc_code = a.rc_code
         where a.po_status ='O'  and a.branch_code = @_branchCode and a.vend_code = dbo.fnParams(@_vendCode,a.vend_code)
           and (
                isnull(@_poDocApp, 'N') <> 'Y'
                or (
                    @_maxAppLevel > 0
                    and exists (
                        select 1
                        from doc_app da
                        where da.tran_id = a.po_id
                          and da.doc_id = 'PO'
                          and isnull(da.app_level, 0) >= @_maxAppLevel
                    )
                )
           )
         )

         select @_result = (select * from cte for json auto)
         select @_result result
    end









    if @mode = 'GetFGPORR_OpenSummary'
    begin

        declare @fgFilterBranchCode nvarchar(10) = coalesce(
            nullif(@_branchCode, ''),
            nullif(json_value(@params, '$.json_data.branchCode'), ''),
            nullif(json_value(@params, '$.branchCode'), ''),
            ''
        );

        declare @fgFilterVendCode nvarchar(25) = coalesce(
            nullif(@_vendCode, ''),
            nullif(json_value(@params, '$.json_data.vendCode'), ''),
            nullif(json_value(@params, '$.vendCode'), ''),
            ''
        );

        select @_result = (
            select
                groupId, branchCode, poNo, poDate, delDate, poType, refNo, rcCode,
                vendCode, vendName, currCode, currRate, whCode, whName, particulars,
                preparedBy, dateStamp, timeStamp
            from dbo.vw_PO_Mode_FGPORR_OpenSummary
            where (@fgFilterBranchCode = '' or branchCode = @fgFilterBranchCode)
              and (@fgFilterVendCode = '' or vendCode = @fgFilterVendCode)
              and (
                    isnull(@_poDocApp, 'N') <> 'Y'
                    or (
                        @_maxAppLevel > 0
                        and exists (
                            select 1
                            from doc_app da
                            where da.tran_id = groupId
                              and da.doc_id = 'PO'
                              and isnull(da.app_level, 0) >= @_maxAppLevel
                        )
                    )
              )
            order by poNo desc
            for json path, include_null_values
        );

        select isnull(@_result, '[]') as result;
        return;
    end;








    if @mode = 'GetRMPORR_OpenSummary'
    begin

        select @_result = (
            select
                groupId, branchCode, poNo, poDate, vendCode, vendName, currCode,
                currRate, whCode, whName, remarks, dateStamp, timeStamp
            from dbo.vw_PO_Mode_RMPORR_OpenSummary
            where branchCode = @_branchCode
              and (
                    isnull(@_poDocApp, 'N') <> 'Y'
                    or (
                        @_maxAppLevel > 0
                        and exists (
                            select 1
                            from doc_app da
                            where da.tran_id = groupId
                              and da.doc_id = 'PO'
                              and isnull(da.app_level, 0) >= @_maxAppLevel
                        )
                    )
              )
            for json auto
        );

        select @_result as result;
    end;








    if @mode = 'GetVEPORR_OpenSummary'
    begin

        select @_result = (
            select
                groupId, branchCode, poNo, poDate, vendCode, vendName, currCode,
                currRate, whCode, whName, remarks, dateStamp, timeStamp
            from dbo.vw_PO_Mode_VEPORR_OpenSummary
            where branchCode = @_branchCode
            for json auto
        );

        select @_result as result;
    end;



    
	



	


	
	
	if @mode = 'GetPORR_OpenDetail'
    begin
        set @_selectedIds = coalesce( json_value(@params, '$.tranIds'), json_value(@params, '$.selectedId'), json_value(@params, '$.json_data.tranIds'), json_value(@params, '$.json_data.selectedId'), @_selectedIds );
       
	   ;with cte as
        (
            select
                groupId, poId, prId, branchCode, poNo, poDate, prNo, ln,
                invType, poStatus, cutoffCode, itemCode, itemName, itemSpecs, uomCode,
                requiredUomCode, requiredQty, conversionFactor, poQuantity, rrQty, qtyBalance,
                prBalance, currCode, unitCost, grossAmount, discRate, discAmount, netAmount,
                vatCode, vatAmount, itemAmount, rcCode, rcName, delDate, categCode
            from dbo.vw_PO_Mode_PORR_OpenDetail
            where poId in
            (
                select ltrim(rtrim(value))
                from string_split(isnull(@_selectedIds, ''), ',')
            )
              and (
                    isnull(@_poDocApp, 'N') <> 'Y'
                    or (
                        @_maxAppLevel > 0
                        and exists (
                            select 1
                            from doc_app da
                            where da.tran_id = poId
                              and da.doc_id = 'PO'
                              and isnull(da.app_level, 0) >= @_maxAppLevel
                        )
                    )
              )
        )


        select @_result = (select * from cte order by poNo, ln for json auto, include_null_values);
        select isnull(@_result, '[]') as result;
        return;
    end;


   
   


   




    if @mode = 'GetFGPORR_OpenDetail'
    begin
        set @_selectedIds = coalesce(
            json_value(@params, '$.tranIds'), json_value(@params, '$.selectedId'),
            json_value(@params, '$.json_data.tranIds'), json_value(@params, '$.json_data.selectedId'),
            @_selectedIds
        );

        ;with cte as
        (
            select
                groupId, poId, prId, branchCode, poNo, poDate, prNo, ln,
                invType, poStatus, cutoffCode, itemCode, itemName, itemSpecs, uomCode,
                requiredUomCode, requiredQty, conversionFactor, poQuantity, rrQty, qtyBalance,
                prBalance, currCode, unitCost, grossAmount, discRate, discAmount, netAmount,
                vatCode, vatAmount, itemAmount, rcCode, rcName, delDate, categCode
            from dbo.vw_PO_Mode_FGPORR_OpenDetail
            where poId in
            (
                select ltrim(rtrim(value))
                from string_split(isnull(@_selectedIds, ''), ',')
            )
              and (
                    isnull(@_poDocApp, 'N') <> 'Y'
                    or (
                        @_maxAppLevel > 0
                        and exists (
                            select 1
                            from doc_app da
                            where da.tran_id = poId
                              and da.doc_id = 'PO'
                              and isnull(da.app_level, 0) >= @_maxAppLevel
                        )
                    )
              )
        )

        select @_result = (select * from cte order by poNo, ln for json auto, include_null_values);
        select isnull(@_result, '[]') as result;
        return;
    end;


    if @mode = 'GetRMPORR_OpenDetail'
    begin
        set @_selectedIds = coalesce( json_value(@params, '$.tranIds'), json_value(@params, '$.selectedId'), json_value(@params, '$.json_data.tranIds'), json_value(@params, '$.json_data.selectedId'), @_selectedIds );
       
	   ;with cte as
        (
            select
                groupId, poId, prId, branchCode, poNo, poDate, prNo, ln,
                invType, poStatus, cutoffCode, itemCode, itemName, itemSpecs, uomCode,
                requiredUomCode, requiredQty, conversionFactor, poQuantity, rrQty, qtyBalance,
                prBalance, currCode, unitCost, grossAmount, discRate, discAmount, netAmount,
                vatCode, vatAmount, itemAmount, rcCode, rcName, delDate, categCode
            from dbo.vw_PO_Mode_RMPORR_OpenDetail
            where poId in
            (
                select ltrim(rtrim(value))
                from string_split(isnull(@_selectedIds, ''), ',')
            )
              and (
                    isnull(@_poDocApp, 'N') <> 'Y'
                    or (
                        @_maxAppLevel > 0
                        and exists (
                            select 1
                            from doc_app da
                            where da.tran_id = poId
                              and da.doc_id = 'PO'
                              and isnull(da.app_level, 0) >= @_maxAppLevel
                        )
                    )
              )
        )


        select @_result = (select * from cte order by poNo, ln for json auto, include_null_values);
        select isnull(@_result, '[]') as result;
        return;
    end;











    if @mode = 'GetVEPORR_OpenDetail'
    begin
        set @_selectedIds = coalesce( json_value(@params, '$.tranIds'), json_value(@params, '$.selectedId'), json_value(@params, '$.json_data.tranIds'), json_value(@params, '$.json_data.selectedId'), @_selectedIds );
       
	   ;with cte as
        (
            select
                groupId, poId, prId, branchCode, poNo, poDate, prNo, ln,
                invType, poStatus, cutoffCode, itemCode, itemName, itemSpecs, uomCode,
                requiredUomCode, requiredQty, conversionFactor, poQuantity, rrQty, qtyBalance,
                prBalance, currCode, unitCost, grossAmount, discRate, discAmount, netAmount,
                vatCode, vatAmount, itemAmount, rcCode, rcName, delDate, categCode
            from dbo.vw_PO_Mode_VEPORR_OpenDetail
            where poId in
            (
                select ltrim(rtrim(value))
                from string_split(isnull(@_selectedIds, ''), ',')
            )
        )


        select @_result = (select * from cte order by poNo, ln for json auto, include_null_values);
        select isnull(@_result, '[]') as result;
        return;
    end;










    if @mode = 'GetPOAPV_Summary'
    begin

        select @_result = (
            select
                groupId, branchCode, branchName, docType, poJoNo, poJoDate, vendCode,
                vendName, paytermCode, paytermName, payterm, currCode, currName, currRate,
                poAmount, vatCode, vatAmount, originalPoAmount, appliedAdvAmount
            from dbo.vw_PO_Mode_POAPV_Summary
            where (@_branchCode = '' or branchCode = @_branchCode)
              and (@_vendCode = '' or vendCode = @_vendCode)
            order by branchCode, poJoNo desc
            for json path, include_null_values
        );

        select isnull(@_result, '[]') as result;
        return;
    end;








    if @mode = 'getAPVPO_OpenSummary'
    begin

        declare @poFilterBranchCode nvarchar(10) = coalesce(
            nullif(@_branchCode, ''),
            nullif(json_value(@params, '$.json_data.branchCode'), ''),
            nullif(json_value(@params, '$.branchCode'), ''),
            ''
        );

        declare @poFilterVendCode nvarchar(25) = coalesce(
            nullif(json_value(@params, '$.json_data.vendCode'), ''),
            nullif(json_value(@params, '$.vendCode'), ''),
            ''
        );

        select @_result = (
            select
                [type], menuCode, referenceSource, rrId, poId, branchCode, rrNo, rrDate,
                rrTranType, poNo, vendCode, vendName, siNo, siDate, siAmount, vatCode,
                vatDesc, vatAmount, rcCode, drAcct, remarks, groupId
            from dbo.vw_PO_Mode_APVPO_OpenSummary
            where branchCode = @poFilterBranchCode
              and (@poFilterVendCode = '' or vendCode = @poFilterVendCode)
            order by poNo desc
            for json path, include_null_values
        );

        select isnull(@_result, '[]') as result;
        return;
    end;





end;
