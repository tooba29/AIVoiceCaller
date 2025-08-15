import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Upload, FileSpreadsheet } from "lucide-react";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";
import Papa from "papaparse";

interface LeadsUploadProps {
  campaignId?: number;
  onLeadsUpload: (leads: any[]) => void;
  uploadedLeads: any[];
}

// Minimal type to satisfy TS for Papa.parse result
interface PapaParseResult<T> {
	data: T[];
	errors: any[];
	meta: any;
}

export default function LeadsUpload({ campaignId, onLeadsUpload, uploadedLeads }: LeadsUploadProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

	// Local state for flexible mapping/editing
	const [rawRows, setRawRows] = useState<any[]>([]);
	const [mappedRows, setMappedRows] = useState<any[]>([]);
	const [headerMap, setHeaderMap] = useState<{ firstName?: string; lastName?: string; contact?: string; fullName?: string }>({});
	const [step, setStep] = useState<'idle' | 'map' | 'edit'>('idle');
	const [isReviewOpen, setIsReviewOpen] = useState(false);

	// CSV upload (original strict server-side path kept)
  const csvUploadMutation = useMutation({
    mutationFn: ({ file, campaignId }: { file: File; campaignId: number }) =>
      api.uploadCSV(file, campaignId.toString()),
    onSuccess: (data) => {
      toast({
        title: "Leads Uploaded",
        description: `${data.leadsCount} leads uploaded successfully!`,
				duration: 1000,
      });
      onLeadsUpload(data.leads || []);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error: any) => {
      toast({
        title: t('leadsUpload.uploadFailed'),
        description: error.message || t('leadsUpload.uploadFailedMessage'),
        variant: "destructive",
      });
    },
  });

	// Import via JSON after mapping/editing
	const importLeadsMutation = useMutation({
		mutationFn: ({ campaignId, leads }: { campaignId: number; leads: any[] }) => api.importLeads(campaignId, leads),
		onSuccess: (data) => {
			toast({ title: "Leads Imported", description: `${data.leadsCount} leads imported successfully!`, duration: 1000 });
			onLeadsUpload(data.leads || []);
			queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
			setStep('idle');
			setRawRows([]);
			setMappedRows([]);
			setHeaderMap({});
			setIsReviewOpen(false);
		},
    onError: (error: any) => {
			toast({ title: "Import Failed", description: error.message || "Failed to import leads", variant: "destructive" });
    },
  });

	const guessHeader = (headers: string[], candidates: string[]): string | undefined => {
		const norm = (s: string) => s.toLowerCase().replace(/[\s_\-]/g, '');
		const candidateSet = new Set(candidates.map(norm));
		for (const h of headers) {
			if (candidateSet.has(norm(h))) return h;
		}
		return undefined;
	};

	const parseCsvClient = (file: File) => {
		Papa.parse(file, {
			header: true,
			skipEmptyLines: true,
			complete: (results: PapaParseResult<Record<string, unknown>>) => {
				const rows = (results.data as any[]).filter(Boolean);
				if (!rows || rows.length === 0) {
					toast({ title: t('leadsUpload.invalidCsv'), description: t('leadsUpload.csvFormatError'), variant: 'destructive' });
					return;
				}
				setRawRows(rows);
				const headers = Object.keys(rows[0] || {});
				const first = guessHeader(headers, ['first_name','firstname','givenname','fname']);
				const last = guessHeader(headers, ['last_name','lastname','surname','lname']);
				const contact = guessHeader(headers, ['contact_no','contactno','phone','phonenumber','mobile','mobilenumber','number','contact','phone_no','phone#']);
				const fullName = guessHeader(headers, ['fullname','full_name','name','contactname','leadname']);
				setHeaderMap({ firstName: first, lastName: last, contact, fullName });
				setStep('map');
			},
			error: () => {
				toast({ title: t('leadsUpload.invalidCsv'), description: t('leadsUpload.csvFormatError'), variant: 'destructive' });
			}
		});
	};

	const buildMappedRows = () => {
		const rows = rawRows.map((r) => {
			let first = headerMap.firstName ? r[headerMap.firstName] : undefined;
			let last = headerMap.lastName ? r[headerMap.lastName] : undefined;
			const full = headerMap.fullName ? r[headerMap.fullName] : undefined;
			if ((!first || !last) && full) {
				const parts = String(full).split(/\s+/).filter(Boolean);
				if (!first && parts.length > 0) first = parts[0];
				if (!last && parts.length > 1) last = parts.slice(1).join(' ');
			}
			const contactRaw = headerMap.contact ? r[headerMap.contact] : undefined;
			return { firstName: first?.toString() || '', lastName: last?.toString() || '', contactNo: contactRaw?.toString() || '' };
		});
		setMappedRows(rows);
		setStep('edit');
	};

  const handleCSVUpload = (file: File) => {
    if (!campaignId) {
			toast({ title: t('leadsUpload.noCampaign'), description: t('leadsUpload.createCampaignFirst'), variant: "destructive" });
      return;
    }

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
			toast({ title: t('leadsUpload.invalidCsv'), description: t('leadsUpload.csvFormatError'), variant: "destructive" });
      return;
    }

		if (file.size > 5 * 1024 * 1024) {
			toast({ title: t('voiceSelection.fileTooLarge'), description: t('leadsUpload.csvTooLarge'), variant: "destructive" });
      return;
    }

		// Use flexible client-side parse + mapping instead of strict server parsing
		parseCsvClient(file);
		// If you still want the old behavior, call: csvUploadMutation.mutate({ file, campaignId })
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
		const csvFile = files.find(file => file.type === 'text/csv' || file.name.endsWith('.csv'));
		if (csvFile) handleCSVUpload(csvFile);
		else toast({ title: t('leadsUpload.invalidCsv'), description: t('leadsUpload.csvFormatError'), variant: "destructive" });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
		if (file) handleCSVUpload(file);
  };

  const handleDeleteLeads = () => {
    if (!campaignId || typeof campaignId !== 'number') {
			toast({ title: "Error", description: "Campaign ID is required", variant: "destructive", duration: 1000 });
      return;
    }
		api.deleteLeads(campaignId).then(() => {
        onLeadsUpload([]);
			toast({ title: "Leads Deleted", description: "All leads have been deleted successfully", duration: 1000 });
		}).catch((error) => {
			toast({ title: "Error", description: error.message || "Failed to delete leads", variant: "destructive", duration: 1000 });
    });
  };

	const canMap = rawRows.length > 0;
	const canImport = mappedRows.length > 0 && !!campaignId;

  return (
    <Card className="border border-border bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-md">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">{t('leadsUpload.title')}</h3>
            <p className="text-sm text-muted-foreground font-medium">{t('leadsUpload.subtitle')}</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* CSV Upload */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 transition-colors cursor-pointer ${
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-slate-300 hover:border-primary/50"
          }`}
          onDrop={handleDrop}
					onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => document.getElementById('csv-upload')?.click()}
        >
          <FileSpreadsheet className="h-8 w-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600 mb-2">{t('leadsUpload.uploadCsv')}</p>
          <p className="text-xs text-slate-500 mb-3">
						You can upload any CSV with columns for name and phone. We’ll help you map them. Phone numbers will default to +971 if no country code.
					</p>
					<Button variant="default" disabled={!campaignId} className="bg-primary hover:bg-primary/90">
                <Upload className="h-4 w-4 mr-2" />
                {t('leadsUpload.uploadCsv')}
          </Button>
					<input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
        </div>

        {!campaignId && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
						<p className="text-sm text-yellow-700">{t('leadsUpload.createCampaignFirst')}</p>
					</div>
				)}

				{/* Mapping step */}
				{step === 'map' && canMap && (
					<div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-3">
						<p className="text-sm font-medium text-slate-700">Map your columns</p>
						<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
							<div>
								<label className="text-xs text-slate-600 block mb-1">First Name</label>
								<select value={headerMap.firstName || ''} onChange={(e) => setHeaderMap(h => ({ ...h, firstName: e.target.value || undefined }))} className="w-full border rounded px-2 py-1 text-sm">
									<option value="">None</option>
									{Object.keys(rawRows[0] || {}).map((h) => <option key={h} value={h}>{h}</option>)}
								</select>
							</div>
							<div>
								<label className="text-xs text-slate-600 block mb-1">Last Name</label>
								<select value={headerMap.lastName || ''} onChange={(e) => setHeaderMap(h => ({ ...h, lastName: e.target.value || undefined }))} className="w-full border rounded px-2 py-1 text-sm">
									<option value="">None</option>
									{Object.keys(rawRows[0] || {}).map((h) => <option key={h} value={h}>{h}</option>)}
								</select>
							</div>
							<div>
								<label className="text-xs text-slate-600 block mb-1">Full Name</label>
								<select value={headerMap.fullName || ''} onChange={(e) => setHeaderMap(h => ({ ...h, fullName: e.target.value || undefined }))} className="w-full border rounded px-2 py-1 text-sm">
									<option value="">None</option>
									{Object.keys(rawRows[0] || {}).map((h) => <option key={h} value={h}>{h}</option>)}
								</select>
							</div>
							<div>
								<label className="text-xs text-slate-600 block mb-1">Number</label>
								<select value={headerMap.contact || ''} onChange={(e) => setHeaderMap(h => ({ ...h, contact: e.target.value || undefined }))} className="w-full border rounded px-2 py-1 text-sm">
									<option value="">Select a column</option>
									{Object.keys(rawRows[0] || {}).map((h) => <option key={h} value={h}>{h}</option>)}
								</select>
							</div>
						</div>
						<div className="flex gap-2">
							<Button variant="default" disabled={!headerMap.contact} onClick={buildMappedRows}>Next: Review & Edit</Button>
							<Button variant="outline" onClick={() => { setStep('idle'); setRawRows([]); setHeaderMap({}); }}>Cancel</Button>
						</div>
					</div>
				)}

				{/* Edit step */}
				{step === 'edit' && mappedRows.length > 0 && (
					<div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-3">
						<div className="flex items-center justify-between mb-2">
							<p className="text-sm font-medium text-slate-700">Review & Edit</p>
							<Badge variant="secondary" className="bg-blue-100 text-blue-700">{mappedRows.length} contacts</Badge>
						</div>
						<div className="max-h-48 overflow-auto border rounded">
							<table className="w-full text-xs">
								<thead className="bg-white sticky top-0">
									<tr>
										<th className="text-left p-2">First Name</th>
										<th className="text-left p-2">Last Name</th>
										<th className="text-left p-2">Phone</th>
									</tr>
								</thead>
								<tbody>
									{mappedRows.slice(0, 20).map((row, idx) => (
										<tr key={idx} className="odd:bg-white even:bg-slate-100">
											<td className="p-2"><input value={row.firstName} onChange={(e) => setMappedRows(r => { const c=[...r]; c[idx] = { ...c[idx], firstName: e.target.value }; return c; })} className="border rounded px-2 py-1 w-full" /></td>
											<td className="p-2"><input value={row.lastName} onChange={(e) => setMappedRows(r => { const c=[...r]; c[idx] = { ...c[idx], lastName: e.target.value }; return c; })} className="border rounded px-2 py-1 w-full" /></td>
											<td className="p-2"><input value={row.contactNo} onChange={(e) => setMappedRows(r => { const c=[...r]; c[idx] = { ...c[idx], contactNo: e.target.value }; return c; })} className="border rounded px-2 py-1 w-full" /></td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className="flex gap-2 flex-wrap">
							<Button variant="secondary" onClick={() => setIsReviewOpen(true)}>Open Full Review</Button>
							<Button variant="default" disabled={!canImport} onClick={() => importLeadsMutation.mutate({ campaignId: campaignId!, leads: mappedRows })}>Import</Button>
							<Button variant="outline" onClick={() => { setStep('map'); setMappedRows([]); }}>Back</Button>
						</div>
          </div>
        )}

        {/* Lead Preview */}
        {uploadedLeads.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <p className="text-sm font-medium text-slate-700">{t('leadsUpload.leadPreview')}</p>
              <div className="flex items-center gap-2 min-w-fit">
								<Badge variant="secondary" className="bg-blue-100 text-blue-700">{uploadedLeads.length} {t('leadsUpload.contacts')}</Badge>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
										<Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">Delete All Leads</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete All Leads</AlertDialogTitle>
											<AlertDialogDescription>Are you sure you want to delete all {uploadedLeads.length} uploaded leads? This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
											<AlertDialogAction onClick={handleDeleteLeads} className="bg-red-600 hover:bg-red-700 text-white">Delete All</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {uploadedLeads.slice(0, 10).map((lead, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-white rounded text-xs">
									<span className="font-medium">{lead.firstName} {lead.lastName}</span>
                  <span className="text-slate-500">{lead.contactNo}</span>
                </div>
              ))}
              {uploadedLeads.length > 10 && (
                <div className="py-2 px-3 text-center text-xs text-slate-500 bg-white rounded">
                  +{uploadedLeads.length - 10} {t('leadsUpload.moreContacts')}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

			{/* Full-screen Review Modal */}
			<Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
				<DialogContent className="max-w-[95vw] w-[95vw]">
					<DialogHeader>
						<DialogTitle>Review & Edit Leads</DialogTitle>
						<DialogDescription>Make changes if needed, then import all contacts.</DialogDescription>
					</DialogHeader>
					<div className="border rounded h-[70vh] overflow-auto">
						<table className="w-full text-sm">
							<thead className="bg-white sticky top-0">
								<tr>
									<th className="text-left p-2">First Name</th>
									<th className="text-left p-2">Last Name</th>
									<th className="text-left p-2">Phone</th>
								</tr>
							</thead>
							<tbody>
								{mappedRows.map((row, idx) => (
									<tr key={idx} className="odd:bg-white even:bg-slate-50">
										<td className="p-2"><input value={row.firstName} onChange={(e) => setMappedRows(r => { const c=[...r]; c[idx] = { ...c[idx], firstName: e.target.value }; return c; })} className="border rounded px-2 py-1 w-full" /></td>
										<td className="p-2"><input value={row.lastName} onChange={(e) => setMappedRows(r => { const c=[...r]; c[idx] = { ...c[idx], lastName: e.target.value }; return c; })} className="border rounded px-2 py-1 w-full" /></td>
										<td className="p-2"><input value={row.contactNo} onChange={(e) => setMappedRows(r => { const c=[...r]; c[idx] = { ...c[idx], contactNo: e.target.value }; return c; })} className="border rounded px-2 py-1 w-full" /></td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<DialogFooter className="gap-2">
						<Button variant="default" disabled={!canImport} onClick={() => importLeadsMutation.mutate({ campaignId: campaignId!, leads: mappedRows })}>Import</Button>
						<Button variant="outline" onClick={() => setIsReviewOpen(false)}>Close</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
    </Card>
  );
}
