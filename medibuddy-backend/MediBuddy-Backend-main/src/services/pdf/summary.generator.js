/**
 * Consultation Summary PDF Generator
 * Uses PDFKit to generate consultation summary PDFs
 */

import PDFDocument from 'pdfkit';

/**
 * Generate a consultation summary PDF
 * @param {Object} data - Summary data
 * @param {Object} data.profile - Profile info
 * @param {Array} data.medications - List of medications
 * @param {Array} data.symptoms - List of symptom logs
 * @param {Object} data.stats - Adherence stats
 * @param {Date} data.startDate - Period start date
 * @param {Date} data.endDate - Period end date
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generateSummaryPdf({ profile, medications, symptoms, stats, startDate, endDate }) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 50, bottom: 50, left: 50, right: 50 }
            });

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Colors
            const primaryColor = '#10B981'; // Mint-500
            const textColor = '#1E293B'; // Slate-800
            const mutedColor = '#64748B'; // Slate-500

            // Header
            doc.fillColor(primaryColor)
                .fontSize(24)
                .font('Helvetica-Bold')
                .text('MediBuddy', 50, 50);

            doc.fillColor(mutedColor)
                .fontSize(10)
                .font('Helvetica')
                .text('Consultation Summary Report', 50, 78);

            doc.moveDown(2);

            // Date range
            const formatDate = (date) => new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            doc.fillColor(textColor)
                .fontSize(12)
                .font('Helvetica-Bold')
                .text(`Period: ${formatDate(startDate)} - ${formatDate(endDate)}`);

            doc.moveDown();

            // Profile info
            doc.fillColor(primaryColor)
                .fontSize(14)
                .font('Helvetica-Bold')
                .text('Patient Information');

            doc.moveDown(0.5);

            doc.fillColor(textColor)
                .fontSize(11)
                .font('Helvetica')
                .text(`Name: ${profile.name || 'Not specified'}`)
                .text(`Relation: ${profile.relation || 'Self'}`)
                .text(`Conditions: ${profile.conditions?.join(', ') || 'None listed'}`);

            doc.moveDown(1.5);

            // Medication Adherence Stats
            doc.fillColor(primaryColor)
                .fontSize(14)
                .font('Helvetica-Bold')
                .text('Medication Adherence');

            doc.moveDown(0.5);

            // Stats box
            const statsY = doc.y;
            doc.rect(50, statsY, 495, 60)
                .fillAndStroke('#F0FDF4', primaryColor);

            doc.fillColor(textColor)
                .fontSize(11)
                .font('Helvetica')
                .text(`Total Reminders: ${stats.totalReminders}`, 70, statsY + 15)
                .text(`Taken: ${stats.acknowledgedReminders}`, 220, statsY + 15)
                .text(`Missed: ${stats.missedReminders}`, 370, statsY + 15);

            doc.fillColor(primaryColor)
                .fontSize(16)
                .font('Helvetica-Bold')
                .text(`${stats.adherenceRate}% Adherence Rate`, 70, statsY + 35);

            doc.y = statsY + 75;
            doc.moveDown();

            // Medications list
            doc.fillColor(primaryColor)
                .fontSize(14)
                .font('Helvetica-Bold')
                .text('Current Medications');

            doc.moveDown(0.5);

            if (medications.length === 0) {
                doc.fillColor(mutedColor)
                    .fontSize(11)
                    .font('Helvetica-Oblique')
                    .text('No medications recorded.');
            } else {
                medications.forEach((med, index) => {
                    doc.fillColor(textColor)
                        .fontSize(11)
                        .font('Helvetica-Bold')
                        .text(`${index + 1}. ${med.name}`);

                    doc.fillColor(mutedColor)
                        .font('Helvetica')
                        .text(`   Dosage: ${med.dosage || 'Not specified'} | Schedule: ${med.times?.join(', ') || 'Not specified'}`);

                    doc.moveDown(0.3);
                });
            }

            doc.moveDown(1.5);

            // Symptoms
            doc.fillColor(primaryColor)
                .fontSize(14)
                .font('Helvetica-Bold')
                .text('Symptom Log');

            doc.moveDown(0.5);

            if (symptoms.length === 0) {
                doc.fillColor(mutedColor)
                    .fontSize(11)
                    .font('Helvetica-Oblique')
                    .text('No symptoms recorded during this period.');
            } else {
                // Only show last 10 symptoms to fit on page
                const displaySymptoms = symptoms.slice(0, 10);

                displaySymptoms.forEach((symptom) => {
                    const logDate = new Date(symptom.loggedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    });

                    const severityColors = {
                        mild: '#10B981',
                        moderate: '#F59E0B',
                        severe: '#EF4444'
                    };

                    doc.fillColor(mutedColor)
                        .fontSize(10)
                        .font('Helvetica')
                        .text(logDate, { continued: true });

                    doc.fillColor(textColor)
                        .font('Helvetica-Bold')
                        .text(` ${symptom.symptom}`, { continued: true });

                    doc.fillColor(severityColors[symptom.severity] || mutedColor)
                        .font('Helvetica')
                        .text(` (${symptom.severity || 'unspecified'})`);

                    if (symptom.notes) {
                        doc.fillColor(mutedColor)
                            .font('Helvetica-Oblique')
                            .text(`   "${symptom.notes}"`);
                    }

                    doc.moveDown(0.3);
                });

                if (symptoms.length > 10) {
                    doc.fillColor(mutedColor)
                        .fontSize(10)
                        .font('Helvetica-Oblique')
                        .text(`... and ${symptoms.length - 10} more symptoms recorded.`);
                }
            }

            // Footer
            const footerY = doc.page.height - 50;
            doc.fillColor(mutedColor)
                .fontSize(8)
                .font('Helvetica')
                .text(
                    `Generated by MediBuddy on ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}. This report is for informational purposes only and does not constitute medical advice.`,
                    50,
                    footerY,
                    { width: 495, align: 'center' }
                );

            // Finalize
            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}

export default { generateSummaryPdf };
