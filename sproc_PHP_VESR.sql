USE [db_a9be64_naysacloudcomp1]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE OR ALTER PROCEDURE [dbo].[sproc_PHP_VESR]
    @mode   nvarchar(max),
    @params nvarchar(max) = null
AS
BEGIN
    SET NOCOUNT ON

    SET @params = CASE WHEN @mode = 'Get' THEN CONCAT('{"json_data":', @params, '}') ELSE @params END

    IF @mode = 'Upsert'
    BEGIN
        DECLARE @requiredValidation TABLE
        (
            errorCount int,
            errorMsg nvarchar(max),
            normalizedParams nvarchar(max)
        )

        SET @params = JSON_MODIFY(@params, '$.json_data.validationDocCode', 'VESR')

        INSERT INTO @requiredValidation (errorCount, errorMsg, normalizedParams)
        EXEC sproc_PHP_VEMast @mode = 'ValidateRequiredDetails', @params = @params

        IF EXISTS (SELECT 1 FROM @requiredValidation WHERE errorCount > 0)
        BEGIN
            SELECT errorMsg, errorCount FROM @requiredValidation
            RETURN
        END

        SELECT @params = normalizedParams FROM @requiredValidation
    END

    DECLARE
        @_dt1 nvarchar(max)                 = JSON_QUERY(@params, '$.json_data.dt1'),
        @_dt2 nvarchar(max)                 = JSON_QUERY(@params, '$.json_data.dt2'),
        @_branchCode nvarchar(10)           = ISNULL(JSON_VALUE(@params, '$.json_data.branchCode'), ''),
        @_srNo nvarchar(25)                 = ISNULL(JSON_VALUE(@params, '$.json_data.srNo'), ''),
        @_vesrId nvarchar(40)               = COALESCE(NULLIF(JSON_VALUE(@params, '$.json_data.vesrId'), ''), NULLIF(JSON_VALUE(@params, '$.json_data.documentID'), '')),
        @_srDate datetime                   = JSON_VALUE(@params, '$.json_data.srDate'),
        @_cutoffCode nvarchar(6)            = ISNULL(JSON_VALUE(@params, '$.json_data.cutoffCode'), ''),
        @_custCode nvarchar(25)             = ISNULL(JSON_VALUE(@params, '$.json_data.custCode'), ''),
        @_custName nvarchar(255)            = ISNULL(JSON_VALUE(@params, '$.json_data.custName'), ''),
        @_siNo nvarchar(30)                 = ISNULL(JSON_VALUE(@params, '$.json_data.siNo'), ''),
        @_cmNo nvarchar(25)                 = COALESCE(NULLIF(JSON_VALUE(@params, '$.json_data.cmNo'), ''), ISNULL(JSON_VALUE(@params, '$.json_data.refCmNo'), '')),
        @_particular nvarchar(max)          = ISNULL(JSON_VALUE(@params, '$.json_data.particular'), ''),
        @_whouseCode nvarchar(15)           = ISNULL(JSON_VALUE(@params, '$.json_data.whouseCode'), ''),
        @_locCode nvarchar(15)              = ISNULL(JSON_VALUE(@params, '$.json_data.locCode'), ''),
        @_refsrNo nvarchar(25)              = COALESCE(NULLIF(JSON_VALUE(@params, '$.json_data.refsrNo'), ''), NULLIF(JSON_VALUE(@params, '$.json_data.refSrNo'), ''), ISNULL(JSON_VALUE(@params, '$.json_data.refVsiNo'), '')),
        @_tranMode nvarchar(1)              = ISNULL(JSON_VALUE(@params, '$.json_data.tranMode'), ''),
        @_tranType nvarchar(10)             = COALESCE(NULLIF(JSON_VALUE(@params, '$.json_data.tranType'), ''), ISNULL(JSON_VALUE(@params, '$.json_data.vesrTranType'), '')),
        @_pnNo nvarchar(100)                = ISNULL(JSON_VALUE(@params, '$.json_data.pnNo'), ''),
        @_currCode nvarchar(3)              = ISNULL(JSON_VALUE(@params, '$.json_data.currCode'), ''),
        @_currRate decimal(18,6)            = ISNULL(JSON_VALUE(@params, '$.json_data.currRate'), 1),
        @_userCode nvarchar(25)             = ISNULL(JSON_VALUE(@params, '$.json_data.userCode'), ''),
        @_direction nvarchar(10)            = ISNULL(JSON_VALUE(@params, '$.json_data.direction'), ''),
        @_startDate datetime                = JSON_VALUE(@params, '$.json_data.startDate'),
        @_endDate datetime                  = JSON_VALUE(@params, '$.json_data.endDate'),
        @_dateStamp datetime                = dbo.fnGetDate(),
        @_timeStamp nvarchar(8)             = dbo.fnGetTimeStamp(),
        @_result nvarchar(max),
        @errorMsg nvarchar(max)             = '',
        @activity nvarchar(max),
        @tranExists bit                     = 0

    IF @mode IN ('Upsert', 'GenerateEntries')
    BEGIN
        DECLARE @details TABLE
        (
            lnNo int not null primary key,
            veId nvarchar(50),
            itemCode nvarchar(25),
            categCode nvarchar(10),
            itemName nvarchar(255),
            uomCode nvarchar(10),
            quantity decimal(18,6),
            unitCost decimal(18,8),
            itemCost decimal(18,6),
            whouseCode nvarchar(15),
            locCode nvarchar(15),
            qstatCode nvarchar(10),
            make nvarchar(50),
            modelYear nvarchar(10),
            model nvarchar(50),
            serialNo nvarchar(50),
            engineNo nvarchar(50),
            prodNo nvarchar(50),
            color nvarchar(50),
            chassisNo nvarchar(50),
            actCode nvarchar(20),
            pnpNo nvarchar(50),
            csrNo nvarchar(50)
        )

        INSERT INTO @details
        SELECT
            ISNULL(j.lnNo, ROW_NUMBER() OVER (ORDER BY (SELECT NULL))),
            NULLIF(j.veId, ''),
            ISNULL(j.itemCode, ''),
            ISNULL(j.categCode, ''),
            ISNULL(j.itemName, ''),
            ISNULL(j.uomCode, ''),
            ISNULL(j.quantity, 0),
            ISNULL(j.unitCost, 0),
            ISNULL(j.itemCost, 0),
            ISNULL(j.whouseCode, @_whouseCode),
            ISNULL(j.locCode, @_locCode),
            ISNULL(j.qstatCode, ''),
            ISNULL(j.make, ''),
            ISNULL(j.modelYear, ''),
            ISNULL(j.model, ''),
            ISNULL(j.serialNo, ''),
            ISNULL(j.engineNo, ''),
            ISNULL(j.prodNo, ''),
            ISNULL(j.color, ''),
            ISNULL(j.chassisNo, ''),
            ISNULL(NULLIF(j.rcCode, ''), ISNULL(j.actCode, '')),
            ISNULL(j.pnpNo, ''),
            ISNULL(j.csrNo, '')
        FROM OPENJSON(@_dt1)
        WITH
        (
            lnNo int '$.lnNo',
            veId nvarchar(50) '$.veId',
            itemCode nvarchar(25) '$.itemCode',
            categCode nvarchar(10) '$.categCode',
            itemName nvarchar(255) '$.itemName',
            uomCode nvarchar(10) '$.uomCode',
            quantity decimal(18,6) '$.quantity',
            unitCost decimal(18,8) '$.unitCost',
            itemCost decimal(18,6) '$.itemCost',
            whouseCode nvarchar(15) '$.whouseCode',
            locCode nvarchar(15) '$.locCode',
            qstatCode nvarchar(10) '$.qstatCode',
            make nvarchar(50) '$.make',
            modelYear nvarchar(10) '$.modelYear',
            model nvarchar(50) '$.model',
            serialNo nvarchar(50) '$.serialNo',
            engineNo nvarchar(50) '$.engineNo',
            prodNo nvarchar(50) '$.prodNo',
            color nvarchar(50) '$.color',
            chassisNo nvarchar(50) '$.chassisNo',
            actCode nvarchar(20) '$.actCode',
            rcCode nvarchar(20) '$.rcCode',
            pnpNo nvarchar(50) '$.pnpNo',
            csrNo nvarchar(50) '$.csrNo'
        ) j

        SET @errorMsg = IIF(@_branchCode = '', CONCAT(@errorMsg, ' - Header - Branch Code', CHAR(10)), @errorMsg)
        SET @errorMsg = IIF(@_srDate IS NULL, CONCAT(@errorMsg, ' - Header - SR Date', CHAR(10)), @errorMsg)
        SET @errorMsg = IIF(@_custCode = '', CONCAT(@errorMsg, ' - Header - Customer Code', CHAR(10)), @errorMsg)
        SET @errorMsg = IIF(@_whouseCode = '', CONCAT(@errorMsg, ' - Header - Warehouse', CHAR(10)), @errorMsg)
        SET @errorMsg = IIF((SELECT COUNT(*) FROM @details) = 0, CONCAT(@errorMsg, ' - SR Details Empty', CHAR(10)), @errorMsg)

        SELECT @errorMsg = @errorMsg + ISNULL(STRING_AGG(message, CHAR(10)) + CHAR(10), '')
        FROM
        (
            SELECT CONCAT(' - SR Detail Line # ', lnNo, ' - Item Code Required') AS message
            FROM @details WHERE itemCode = ''
            UNION ALL
            SELECT CONCAT(' - SR Detail Line # ', lnNo, ' - Quantity Returned must be greater than 0')
            FROM @details WHERE quantity <= 0
            UNION ALL
            SELECT CONCAT(' - SR Detail Line # ', lnNo, ' - Chassis / CS No Required')
            FROM @details WHERE chassisNo = ''
            UNION ALL
            SELECT CONCAT(' - SR Detail Line # ', lnNo, ' - Model Year must be a 4-digit year from 1900 to ', YEAR(dbo.fnGetDate()) + 1)
            FROM @details
            WHERE NULLIF(LTRIM(RTRIM(modelYear)), '') IS NOT NULL
              AND
              (
                  modelYear NOT LIKE REPLICATE('[0-9]', 4)
                  OR LEN(modelYear) <> 4
                  OR TRY_CONVERT(int, modelYear) NOT BETWEEN 1900 AND YEAR(dbo.fnGetDate()) + 1
              )
            UNION ALL
            SELECT CONCAT(' - SR Detail Line # ', lnNo, ' - Vehicle item does not exist')
            FROM @details d WHERE NOT EXISTS (SELECT 1 FROM ve_mast m WHERE m.item_code = d.itemCode)
        ) errors

        IF @errorMsg <> ''
        BEGIN
            SELECT 'The following fields are required:' + CHAR(10) + CHAR(10) + @errorMsg AS errorMsg, 1 AS errorCount
            RETURN
        END

        IF @mode = 'GenerateEntries'
        BEGIN
            SET @errorMsg = ''

            SELECT @errorMsg = @errorMsg + ISNULL(STRING_AGG(message, CHAR(10)) + CHAR(10), '')
            FROM
            (
                SELECT CONCAT(' - SR Detail Line # ', d.lnNo, ' - Vehicle Category Required') AS message
                FROM @details d
                LEFT JOIN ve_mast m ON m.item_code = d.itemCode
                WHERE NULLIF(COALESCE(NULLIF(d.categCode, ''), m.categ_code), '') IS NULL

                UNION ALL

                SELECT CONCAT(' - SR Detail Line # ', d.lnNo, ' - Vehicle Category Inventory Account Required')
                FROM @details d
                LEFT JOIN ve_mast m ON m.item_code = d.itemCode
                LEFT JOIN ve_categ c ON c.categ_code = COALESCE(NULLIF(d.categCode, ''), m.categ_code)
                WHERE NULLIF(c.invacct_code, '') IS NULL

                UNION ALL

                SELECT CONCAT(' - SR Detail Line # ', d.lnNo, ' - Vehicle Category RR Account Required')
                FROM @details d
                LEFT JOIN ve_mast m ON m.item_code = d.itemCode
                LEFT JOIN ve_categ c ON c.categ_code = COALESCE(NULLIF(d.categCode, ''), m.categ_code)
                WHERE NULLIF(c.rracct_code, '') IS NULL

                UNION ALL

                SELECT CONCAT(' - SR Detail Line # ', d.lnNo, ' - Inventory Account ', c.invacct_code, ' does not exist')
                FROM @details d
                LEFT JOIN ve_mast m ON m.item_code = d.itemCode
                JOIN ve_categ c ON c.categ_code = COALESCE(NULLIF(d.categCode, ''), m.categ_code)
                LEFT JOIN coa_mast a ON a.acct_code = c.invacct_code
                WHERE NULLIF(c.invacct_code, '') IS NOT NULL
                  AND a.acct_code IS NULL

                UNION ALL

                SELECT CONCAT(' - SR Detail Line # ', d.lnNo, ' - RR Account ', c.rracct_code, ' does not exist')
                FROM @details d
                LEFT JOIN ve_mast m ON m.item_code = d.itemCode
                JOIN ve_categ c ON c.categ_code = COALESCE(NULLIF(d.categCode, ''), m.categ_code)
                LEFT JOIN coa_mast a ON a.acct_code = c.rracct_code
                WHERE NULLIF(c.rracct_code, '') IS NOT NULL
                  AND a.acct_code IS NULL
            ) errors

            IF @errorMsg <> ''
            BEGIN
                SELECT 'Validation Failed' + CHAR(10) + CHAR(10) + @errorMsg AS errorMsg, 1 AS errorCount
                RETURN
            END

            DECLARE @generatedLedger TABLE
            (
                id int identity(1,1),
                acctCode nvarchar(25),
                acctName nvarchar(200),
                rcCode nvarchar(20),
                rcName nvarchar(200),
                sltypeCode nvarchar(10),
                slCode nvarchar(25),
                slName nvarchar(200),
                particular nvarchar(255),
                vatCode nvarchar(10),
                atcCode nvarchar(10),
                debit decimal(18,2),
                credit decimal(18,2),
                debitFx1 decimal(18,2),
                creditFx1 decimal(18,2),
                debitFx2 decimal(18,2),
                creditFx2 decimal(18,2),
                slRefNo nvarchar(25),
                slRefDate date,
                remarks nvarchar(4000),
                dt1Lineno nvarchar(100)
            )

            INSERT INTO @generatedLedger
            (
                acctCode, acctName, rcCode, rcName, sltypeCode, slCode, slName,
                particular, vatCode, atcCode, debit, credit, debitFx1, creditFx1,
                debitFx2, creditFx2, slRefNo, slRefDate, remarks, dt1Lineno
            )
            SELECT
                entry.acctCode, a.acct_name,
                CASE WHEN ISNULL(a.req_rc, '') = 'Y' THEN ISNULL(c.rc_code, '') ELSE '' END,
                CASE WHEN ISNULL(a.req_rc, '') = 'Y' THEN ISNULL(r.rc_name, '') ELSE '' END,
                CASE WHEN ISNULL(a.req_sl, '') = 'Y' THEN 'CU' ELSE '' END,
                CASE WHEN ISNULL(a.req_sl, '') = 'Y' THEN @_custCode ELSE '' END,
                CASE WHEN ISNULL(a.req_sl, '') = 'Y' THEN @_custName ELSE '' END,
                '', '', '', entry.debit, entry.credit,
                entry.debit, entry.credit, 0, 0,
                d.itemCode, CAST(@_srDate AS date), '', CONVERT(nvarchar(100), d.lnNo)
            FROM @details d
            LEFT JOIN ve_mast m ON m.item_code = d.itemCode
            JOIN ve_categ c ON c.categ_code = COALESCE(NULLIF(d.categCode, ''), m.categ_code)
            CROSS APPLY
            (
                SELECT c.invacct_code AS acctCode, ABS(CAST(d.itemCost AS decimal(18,2))) AS debit, CAST(0 AS decimal(18,2)) AS credit
                UNION ALL
                SELECT c.rracct_code, CAST(0 AS decimal(18,2)), ABS(CAST(d.itemCost AS decimal(18,2)))
            ) entry
            JOIN coa_mast a ON a.acct_code = entry.acctCode
            LEFT JOIN rc_mast r ON r.rc_code = c.rc_code
            WHERE ABS(ISNULL(d.itemCost, 0)) > 0

            UPDATE @generatedLedger
            SET particular = dbo.fnGLParticular(acctCode, slName, rcName)

            IF NOT EXISTS (SELECT 1 FROM @generatedLedger)
            BEGIN
                SELECT 'No GL entries were generated. Returned item amount must be greater than zero.' AS errorMsg, 1 AS errorCount
                RETURN
            END

            IF ISNULL((SELECT ROUND(SUM(ISNULL(debit, 0) - ISNULL(credit, 0)), 2) FROM @generatedLedger), 0) <> 0
            BEGIN
                SELECT 'Unbalanced Debit/Credit' AS errorMsg, 1 AS errorCount
                RETURN
            END

            SET @_result =
            (
                SELECT
                    id, acctCode, acctName, rcCode, rcName, sltypeCode, slCode, slName,
                    particular, vatCode, '' AS vatName, atcCode, '' AS atcName,
                    debit, credit, debitFx1, creditFx1, debitFx2, creditFx2,
                    slRefNo, slRefDate, remarks, dt1Lineno
                FROM @generatedLedger
                ORDER BY id
                FOR JSON PATH, INCLUDE_NULL_VALUES
            )

            SELECT ISNULL(@_result, '[]') AS result
            RETURN
        END

        BEGIN TRY
            BEGIN TRANSACTION

            IF NULLIF(@_vesrId, '') IS NULL
            BEGIN
                SELECT @_vesrId = vesr_id
                FROM vesr_hd WITH (UPDLOCK, HOLDLOCK)
                WHERE branch_code = @_branchCode
                  AND sr_no = @_srNo
            END

            IF NULLIF(@_vesrId, '') IS NOT NULL
               AND EXISTS (
                    SELECT 1
                    FROM vesr_hd
                    WHERE vesr_id = @_vesrId
                      AND (ISNULL(stat, '') <> '' OR ISNULL(cancelled, '') = 'Y')
               )
            BEGIN
                ROLLBACK TRANSACTION
                SELECT 'Posted, closed, or cancelled sales returns cannot be edited.' AS errorMsg, 1 AS errorCount
                RETURN
            END

            SET @tranExists = CASE WHEN EXISTS (SELECT 1 FROM vesr_hd WHERE vesr_id = @_vesrId) THEN 1 ELSE 0 END
            SET @_vesrId = CASE WHEN @_vesrId IS NULL OR @_vesrId = '' THEN CONVERT(nvarchar(40), NEWID()) ELSE @_vesrId END
            SET @_srNo = CASE WHEN @_srNo IS NULL OR @_srNo = '' THEN dbo.fnGetNextDocumentNo('VESR','',@_branchCode) ELSE @_srNo END
            SET @_cutoffCode = COALESCE(NULLIF(@_cutoffCode, ''), dbo.fnGetPeriod(@_srDate))

            UPDATE d
            SET d.veId = old.ve_id
            FROM @details d
            JOIN vesr_dt1 old
              ON old.vesr_id = @_vesrId
             AND old.line_no = d.lnNo
            WHERE NULLIF(d.veId, '') IS NULL

            UPDATE @details
            SET veId = CONVERT(nvarchar(50), NEWID())
            WHERE NULLIF(veId, '') IS NULL

            IF @tranExists = 0
            BEGIN
                INSERT INTO vesr_hd
                (
                    branch_code, sr_no, sr_date, cutoff_code, cust_code,
                    cust_name, si_no, cm_no, particular, stat,
                    cancelled, locked_by, tran_date, user_code, date_stamp,
                    time_stamp, whouse_code, loc_code, refsr_no, no_reprints,
                    tran_mode, tran_type, pn_no, vesr_id
                )
                VALUES
                (
                    @_branchCode, @_srNo, @_srDate, @_cutoffCode, @_custCode,
                    @_custName, @_siNo, @_cmNo, @_particular, '',
                    '', '', @_srDate, @_userCode, @_dateStamp,
                    @_timeStamp, @_whouseCode, @_locCode, @_refsrNo, 0,
                    @_tranMode, @_tranType, @_pnNo, @_vesrId
                )

                EXEC sproc_PHP_DocSign
                    @_mode = 'Upsert',
                    @_tranid = @_vesrId,
                    @_docID = 'VESR',
                    @_docno = @_srNo,
                    @_userCode = @_userCode,
                    @_branchCode = @_branchCode

                EXEC sproc_PHP_DocApp
                    @_mode = 'Upsert',
                    @_tranid = @_vesrId,
                    @_docID = 'VESR'
            END
            ELSE
            BEGIN
                UPDATE vesr_hd SET
                    sr_date = @_srDate,
                    cutoff_code = @_cutoffCode,
                    cust_code = @_custCode,
                    cust_name = @_custName,
                    si_no = @_siNo,
                    cm_no = @_cmNo,
                    particular = @_particular,
                    whouse_code = @_whouseCode,
                    loc_code = @_locCode,
                    refsr_no = @_refsrNo,
                    tran_mode = @_tranMode,
                    tran_type = @_tranType,
                    pn_no = @_pnNo
                WHERE vesr_id = @_vesrId
            END

            DELETE FROM vesr_dt1 WHERE vesr_id = @_vesrId
            INSERT INTO vesr_dt1
            (
                ve_id, branch_code, sr_no, sr_date, cutoff_code,
                line_no, item_code, item_name, uom_code, qty_ret,
                unit_cost, amt_ret, make, model_yr, model,
                serial_no, engine_no, prod_no, color, cs_no,
                act_code, whouse_code, loc_code, qstat_code, csr_no,
                pnp_no, vesr_id
            )
            SELECT
                d.veId, @_branchCode, @_srNo, @_srDate, @_cutoffCode,
                d.lnNo, d.itemCode, d.itemName, d.uomCode, d.quantity,
                d.unitCost, d.itemCost, d.make, d.modelYear, d.model,
                d.serialNo, d.engineNo, d.prodNo, d.color, d.chassisNo,
                d.actCode, d.whouseCode, d.locCode, d.qstatCode, d.csrNo,
                d.pnpNo, @_vesrId
            FROM @details d

            DELETE FROM vesr_dt2 WHERE vesr_id = @_vesrId
            IF ISNULL(@_dt2, '') NOT IN ('', 'null')
            BEGIN
                INSERT INTO vesr_dt2
                (
                    branch_code, cutoff_code, rec_no, acct_code, act_code,
                    sl_code, particular, vat_code, vat_desc, ewt_code,
                    ewt_desc, debit, credit, remarks, user_code,
                    slref_no, sr_no, sr_date,
                    debit_fx1, credit_fx1, debit_fx2, credit_fx2, vesr_id
                )
                SELECT
                    @_branchCode, @_cutoffCode,
                    RIGHT('000' + CONVERT(nvarchar(3), ROW_NUMBER() OVER (ORDER BY (SELECT NULL))), 3),
                    ISNULL(j.acctCode, ''), ISNULL(NULLIF(j.rcCode, ''), ISNULL(j.actCode, '')),
                    ISNULL(j.slCode, ''), ISNULL(j.particular, ''),
                    ISNULL(j.vatCode, ''), ISNULL(j.vatDesc, ''),
                    ISNULL(j.ewtCode, ''), ISNULL(j.ewtDesc, ''),
                    ISNULL(j.debit, 0), ISNULL(j.credit, 0),
                    ISNULL(j.remarks, ''), @_userCode,
                    ISNULL(j.slrefNo, ''), @_srNo, @_srDate,
                    ISNULL(j.debitFx1, 0), ISNULL(j.creditFx1, 0),
                    ISNULL(j.debitFx2, 0), ISNULL(j.creditFx2, 0), @_vesrId
                FROM OPENJSON(@_dt2)
                WITH
                (
                    acctCode nvarchar(25) '$.acctCode',
                    actCode nvarchar(20) '$.actCode',
                    rcCode nvarchar(20) '$.rcCode',
                    slCode nvarchar(25) '$.slCode',
                    particular nvarchar(255) '$.particular',
                    vatCode nvarchar(10) '$.vatCode',
                    vatDesc nvarchar(200) '$.vatDesc',
                    ewtCode nvarchar(2) '$.ewtCode',
                    ewtDesc nvarchar(200) '$.ewtDesc',
                    debit decimal(18,2) '$.debit',
                    credit decimal(18,2) '$.credit',
                    remarks nvarchar(4000) '$.remarks',
                    slrefNo nvarchar(25) '$.slrefNo',
                    debitFx1 decimal(18,2) '$.debitFx1',
                    creditFx1 decimal(18,2) '$.creditFx1',
                    debitFx2 decimal(18,2) '$.debitFx2',
                    creditFx2 decimal(18,2) '$.creditFx2'
                ) j
            END

            SET @activity = CASE WHEN @tranExists = 0 THEN 'Created' ELSE 'Edited' END
            EXEC sproc_PHP_DocTrail
                @_mode = 'Upsert',
                @_tranId = @_vesrId,
                @_docCode = 'VESR',
                @_userCode = @_userCode,
                @_docNo = @_srNo,
                @_branchCode = @_branchCode,
                @_activity = @activity

            COMMIT TRANSACTION

            SELECT
                @_vesrId AS vesrId,
                @_vesrId AS vesrHdId,
                @_srNo AS srNo,
                0 AS errorCount,
                '' AS errorMsg
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
            SELECT ERROR_MESSAGE() AS errorMsg, 1 AS errorCount
        END CATCH

        RETURN
    END

    IF @mode = 'Get'
    BEGIN
        SET @_direction = CASE WHEN @_direction = '' OR @_direction IS NULL THEN '' ELSE @_direction END

        IF @_direction <> ''
        BEGIN
            SET @_vesrId = dbo.fn_GetRetrieval_TranID('VESR', @_branchCode, @_srNo, @_direction)
        END

        IF NULLIF(@_vesrId, '') IS NULL
        BEGIN
            SELECT @_vesrId = vesr_id
            FROM vesr_hd
            WHERE branch_code = @_branchCode
              AND sr_no = @_srNo
        END

        IF NULLIF(@_vesrId, '') IS NULL
        BEGIN
            SELECT '{"result":null}' AS result
            RETURN
        END

        DECLARE
            @_getDt1 nvarchar(max),
            @_getDt2 nvarchar(max)

        SET @_getDt1 = (
            SELECT
                d.ve_id AS veId,
                d.ve_id AS groupId,
                d.line_no AS lnNo,
                d.item_code AS itemCode,
                CAST('' AS nvarchar(10)) AS categCode,
                d.item_name AS itemName,
                d.uom_code AS uomCode,
                d.qty_ret AS quantity,
                CAST(0 AS decimal(18,6)) AS balance,
                d.unit_cost AS unitCost,
                d.unit_cost AS unitCostFx,
                d.amt_ret AS itemCost,
                d.whouse_code AS whouseCode,
                d.loc_code AS locCode,
                CAST('' AS nvarchar(10)) AS vatCode,
                CAST(0 AS decimal(18,6)) AS vatRate,
                CAST(0 AS decimal(18,6)) AS vatAmount,
                CAST('' AS nvarchar(15)) AS poNo,
                CAST('' AS nvarchar(3)) AS poLineno,
                CAST('' AS nvarchar(8)) AS prNo,
                CAST('' AS nvarchar(3)) AS prLineno,
                d.qstat_code AS qstatCode,
                d.make,
                d.model_yr AS modelYear,
                d.model,
                d.serial_no AS serialNo,
                d.engine_no AS engineNo,
                d.prod_no AS prodNo,
                d.color,
                d.cs_no AS chassisNo,
                @_currCode AS currCode,
                @_currRate AS currRate,
                CAST(0 AS decimal(18,6)) AS fxAmount,
                CAST(0 AS decimal(18,6)) AS poQty,
                CAST('' AS nvarchar(4000)) AS specs,
                d.amt_ret AS netAmount,
                d.act_code AS actCode,
                ISNULL(r.rc_name, '') AS actDesc,
                CAST(0 AS decimal(18,8)) AS shippingCost,
                CAST(0 AS decimal(18,8)) AS landedCost,
                CAST(0 AS decimal(18,8)) AS unitShipCost,
                CAST(0 AS decimal(18,8)) AS unitLandedCost,
                d.pnp_no AS pnpNo,
                d.csr_no AS csrNo
            FROM vesr_dt1 d
            LEFT JOIN rc_mast r ON r.rc_code = d.act_code
            WHERE d.vesr_id = @_vesrId
            ORDER BY d.line_no
            FOR JSON PATH, INCLUDE_NULL_VALUES
        )

        SET @_getDt2 = (
            SELECT
                d.rec_no AS recNo,
                d.acct_code AS acctCode,
                d.act_code AS actCode,
                d.sl_code AS slCode,
                d.particular,
                d.vat_code AS vatCode,
                d.vat_desc AS vatDesc,
                d.ewt_code AS ewtCode,
                d.ewt_desc AS ewtDesc,
                d.debit,
                d.credit,
                d.remarks,
                d.slref_no AS slrefNo,
                d.debit_fx1 AS debitFx1,
                d.credit_fx1 AS creditFx1,
                d.debit_fx2 AS debitFx2,
                d.credit_fx2 AS creditFx2
            FROM vesr_dt2 d
            WHERE d.vesr_id = @_vesrId
            ORDER BY d.rec_no
            FOR JSON PATH, INCLUDE_NULL_VALUES
        )

        SET @_result = (
            SELECT TOP 1
                h.branch_code AS branchCode,
                h.vesr_id AS vesrId,
                h.sr_no AS srNo,
                h.sr_date AS srDate,
                h.cutoff_code AS cutoffCode,
                h.cust_code AS custCode,
                h.cust_name AS custName,
                h.si_no AS siNo,
                h.cm_no AS cmNo,
                h.particular,
                h.stat,
                h.cancelled,
                h.whouse_code AS whouseCode,
                h.loc_code AS locCode,
                h.refsr_no AS refsrNo,
                h.no_reprints AS noReprints,
                h.tran_mode AS tranMode,
                h.tran_type AS vesrTranType,
                h.pn_no AS pnNo,
                @_currCode AS currCode,
                @_currRate AS currRate,
                dt1 = JSON_QUERY(ISNULL(@_getDt1, '[]')),
                dt2 = JSON_QUERY(ISNULL(@_getDt2, '[]'))
            FROM vesr_hd h
            WHERE h.vesr_id = @_vesrId
            FOR JSON PATH, INCLUDE_NULL_VALUES, WITHOUT_ARRAY_WRAPPER
        )

        SELECT @_result AS result
        RETURN
    END

    IF @mode = 'Cancel'
    BEGIN
        UPDATE vesr_hd
        SET cancelled = 'Y'
        WHERE vesr_id = @_vesrId
          AND ISNULL(stat, '') = ''
          AND ISNULL(cancelled, '') <> 'Y'

        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 'Only an existing open sales return can be cancelled.' AS errorMsg, 1 AS errorCount
            RETURN
        END

        EXEC sproc_PHP_DocTrail
            @_mode = 'Upsert',
            @_tranId = @_vesrId,
            @_docCode = 'VESR',
            @_userCode = @_userCode,
            @_docNo = @_srNo,
            @_branchCode = @_branchCode,
            @_activity = 'Cancelled'

        SELECT 0 AS errorCount, '' AS errorMsg
        RETURN
    END

    IF @mode = 'Delete'
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM vesr_hd
            WHERE vesr_id = @_vesrId
              AND (ISNULL(stat, '') <> '' OR ISNULL(cancelled, '') = 'Y')
        )
        BEGIN
            SELECT 'Posted, closed, or cancelled sales returns cannot be deleted.' AS errorMsg, 1 AS errorCount
            RETURN
        END

        BEGIN TRY
            BEGIN TRANSACTION
            DELETE FROM vesr_dt2 WHERE vesr_id = @_vesrId
            DELETE FROM vesr_dt1 WHERE vesr_id = @_vesrId
            DELETE FROM vesr_hd WHERE vesr_id = @_vesrId

            EXEC sproc_PHP_DocTrail
                @_mode = 'Upsert',
                @_tranId = @_vesrId,
                @_docCode = 'VESR',
                @_userCode = @_userCode,
                @_docNo = @_srNo,
                @_branchCode = @_branchCode,
                @_activity = 'Deleted'

            COMMIT TRANSACTION
            SELECT 0 AS errorCount, '' AS errorMsg
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
            SELECT ERROR_MESSAGE() AS errorMsg, 1 AS errorCount
        END CATCH

        RETURN
    END

    IF @mode = 'History'
    BEGIN
        DECLARE
            @_historySummary nvarchar(max),
            @_historyDetail nvarchar(max),
            @_historyLedger nvarchar(max)

        SET @_historySummary =
        (
            SELECT
                h.branch_code AS branchCode,
                ISNULL(b.branch_name, '') AS branchName,
                h.vesr_id AS vesrId,
                h.sr_no AS docNo,
                h.sr_date AS srDate,
                h.cust_code AS custCode,
                h.cust_name AS custName,
                h.si_no AS siNo,
                h.cm_no AS cmNo,
                h.whouse_code AS whouseCode,
                h.loc_code AS locCode,
                h.refsr_no AS refsrNo,
                h.tran_type AS vesrTranType,
                h.pn_no AS pnNo,
                h.particular AS particular,
                dbo.fnGetDocumentStatusHistory(h.stat, h.cancelled) AS srStatus,
                dbo.fnGetDocumentStatusHistory(h.stat, h.cancelled) AS docStatus,
                h.user_code AS userCode,
                h.date_stamp AS dateStamp,
                h.time_stamp AS timeStamp
            FROM dbo.vesr_hd h
            LEFT JOIN dbo.branch_ref b ON b.branch_code = h.branch_code
            WHERE (@_startDate IS NULL OR h.sr_date >= @_startDate)
              AND (@_endDate IS NULL OR h.sr_date < DATEADD(day, 1, @_endDate))
              AND (@_branchCode = '' OR h.branch_code = @_branchCode)
            ORDER BY h.branch_code, h.sr_no DESC
            FOR JSON PATH, INCLUDE_NULL_VALUES
        )

        SET @_historyDetail =
        (
            SELECT
                h.branch_code AS branchCode,
                ISNULL(b.branch_name, '') AS branchName,
                h.sr_no AS docNo,
                h.sr_date AS srDate,
                h.cust_code AS custCode,
                h.cust_name AS custName,
                d.line_no AS lnNo,
                d.ve_id AS groupId,
                d.item_code AS itemCode,
                d.item_name AS itemName,
                d.uom_code AS uomCode,
                d.qty_ret AS quantity,
                d.unit_cost AS unitCost,
                d.amt_ret AS itemCost,
                d.qstat_code AS qstatCode,
                d.make AS make,
                d.model_yr AS modelYear,
                d.model AS model,
                d.serial_no AS serialNo,
                d.engine_no AS engineNo,
                d.prod_no AS prodNo,
                d.color AS color,
                d.cs_no AS chassisNo,
                d.whouse_code AS whouseCode,
                d.loc_code AS locCode,
                d.act_code AS rcCode,
                ISNULL(r.rc_name, '') AS rcName,
                d.pnp_no AS pnpNo,
                d.csr_no AS csrNo,
                dbo.fnGetDocumentStatusHistory(h.stat, h.cancelled) AS docStatus
            FROM dbo.vesr_hd h
            INNER JOIN dbo.vesr_dt1 d ON d.vesr_id = h.vesr_id
            LEFT JOIN dbo.branch_ref b ON b.branch_code = h.branch_code
            LEFT JOIN dbo.rc_mast r ON r.rc_code = d.act_code
            WHERE (@_startDate IS NULL OR h.sr_date >= @_startDate)
              AND (@_endDate IS NULL OR h.sr_date < DATEADD(day, 1, @_endDate))
              AND (@_branchCode = '' OR h.branch_code = @_branchCode)
            ORDER BY h.branch_code, h.sr_no DESC, d.line_no
            FOR JSON PATH, INCLUDE_NULL_VALUES
        )

        SET @_historyLedger =
        (
            SELECT
                h.branch_code AS branchCode,
                ISNULL(b.branch_name, '') AS branchName,
                h.sr_no AS docNo,
                h.sr_date AS srDate,
                d.rec_no AS recNo,
                d.acct_code AS acctCode,
                ISNULL(c.acct_name, '') AS acctName,
                d.sl_code AS slCode,
                d.act_code AS rcCode,
                ISNULL(r.rc_name, '') AS rcName,
                d.particular AS particular,
                d.vat_code AS vatCode,
                d.ewt_code AS ewtCode,
                d.debit AS debit,
                d.credit AS credit,
                d.slref_no AS slRefNo,
                CAST(NULL AS datetime) AS slRefDate,
                d.remarks AS remarks,
                dbo.fnGetDocumentStatusHistory(h.stat, h.cancelled) AS docStatus
            FROM dbo.vesr_hd h
            INNER JOIN dbo.vesr_dt2 d ON d.vesr_id = h.vesr_id
            LEFT JOIN dbo.branch_ref b ON b.branch_code = h.branch_code
            LEFT JOIN dbo.coa_mast c ON c.acct_code = d.acct_code
            LEFT JOIN dbo.rc_mast r ON r.rc_code = d.act_code
            WHERE (@_startDate IS NULL OR h.sr_date >= @_startDate)
              AND (@_endDate IS NULL OR h.sr_date < DATEADD(day, 1, @_endDate))
              AND (@_branchCode = '' OR h.branch_code = @_branchCode)
            ORDER BY h.branch_code, h.sr_no DESC, d.rec_no
            FOR JSON PATH, INCLUDE_NULL_VALUES
        )

        SET @_result =
        (
            SELECT
                JSON_QUERY(ISNULL(@_historySummary, '[]')) AS VESR_Summary,
                JSON_QUERY(ISNULL(@_historyDetail, '[]')) AS VESR_Item_Detail,
                JSON_QUERY(ISNULL(@_historyLedger, '[]')) AS VESR_General_Ledger
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        )

        SELECT ISNULL(@_result, '{}') AS result
        RETURN
    END

    IF @mode = 'Posting'
    BEGIN
        SET @_result = (
            SELECT
                h.branch_code AS branchCode,
                b.branch_name AS branchName,
                h.vesr_id AS vesrId,
                h.sr_no AS srNo,
                h.sr_date AS srDate,
                h.cust_code AS custCode,
                h.cust_name AS custName,
                h.si_no AS siNo,
                h.cm_no AS cmNo,
                h.particular AS particular
            FROM vesr_hd h
            LEFT JOIN branch_ref b
                ON b.branch_code = h.branch_code
            WHERE ISNULL(h.stat, '') = ''
              AND ISNULL(h.cancelled, '') <> 'Y'
              AND (@_branchCode = '' OR h.branch_code = @_branchCode)
            ORDER BY h.sr_no DESC
            FOR JSON PATH, INCLUDE_NULL_VALUES
        )

        SELECT ISNULL(@_result, '[]') AS result
        RETURN
    END

    IF @mode = 'CheckDuplicate'
    BEGIN
        SELECT CASE
            WHEN EXISTS (
                SELECT 1
                FROM vesr_hd
                WHERE branch_code = @_branchCode
                  AND sr_no = @_srNo
            ) THEN '1'
            ELSE '0'
        END AS result
        RETURN
    END
END
GO
